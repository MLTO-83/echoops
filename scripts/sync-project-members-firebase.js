// scripts/sync-project-members-firebase.js
// Syncs project members from Azure DevOps teams into Firestore (Firebase version)

const { adminDb } = require("./firebase-admin-init.js");

// ─── Firestore Collection References ─────────────────────────────────────

const projectsCol = adminDb.collection("projects");
const adoConnectionsCol = adminDb.collection("adoConnections");
const usersCol = adminDb.collection("users");

// Subcollection helpers (mirrors src/lib/firebase/db.ts)
function membersCol(projectId) {
  return projectsCol.doc(projectId).collection("members");
}
function weeklyHoursCol(projectId, userId) {
  return membersCol(projectId).doc(userId).collection("weeklyHours");
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function getCurrentWeekNumber() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

const currentYear = new Date().getFullYear();
const currentWeek = getCurrentWeekNumber();

function snapToDoc(snap) {
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Data Access ─────────────────────────────────────────────────────────

async function findUserByEmailOrAdoId(email, adoUserId) {
  // Try email first
  const byEmail = await usersCol.where("email", "==", email).limit(1).get();
  if (!byEmail.empty) return { id: byEmail.docs[0].id, ...byEmail.docs[0].data() };
  // Try ADO user ID
  if (adoUserId) {
    const byAdo = await usersCol.where("adoUserId", "==", adoUserId).limit(1).get();
    if (!byAdo.empty) return { id: byAdo.docs[0].id, ...byAdo.docs[0].data() };
  }
  return null;
}

async function createUser(data) {
  const now = new Date();
  const docData = {
    name: data.name || null,
    email: data.email || null,
    emailVerified: null,
    image: null,
    organizationId: data.organizationId || null,
    createdAt: now,
    updatedAt: now,
    theme: data.theme || "dark",
    adoUserId: data.adoUserId || null,
    maxHoursPerWeek: data.maxHoursPerWeek ?? 40,
    licenseType: data.licenseType || "FREE",
  };
  const ref = await usersCol.add(docData);
  return { id: ref.id, ...docData };
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting project member synchronization...");

  // Find all projects with ADO connections
  const projectsSnap = await projectsCol
    .where("adoProjectId", "!=", null)
    .get();

  // Filter to only those that also have adoConnectionId
  const projects = projectsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((p) => p.adoConnectionId);

  console.log(
    `Found ${projects.length} projects with ADO connections to sync members`
  );

  let totalMembersAdded = 0;
  let processedProjects = 0;

  for (const project of projects) {
    console.log(`\nProcessing project: ${project.name} (${project.id})`);
    console.log(`ADO Project ID: ${project.adoProjectId}`);

    // Fetch ADO connection (doc ID = organizationId = adoConnectionId)
    const adoConnSnap = await adoConnectionsCol.doc(project.adoConnectionId).get();
    const adoConnection = snapToDoc(adoConnSnap);

    if (!adoConnection) {
      console.log(`No ADO connection for project ${project.id}, skipping`);
      continue;
    }

    const { pat, adoOrganizationUrl } = adoConnection;

    if (!pat || !adoOrganizationUrl) {
      console.log(
        `ADO connection is not properly configured for project ${project.id}, skipping`
      );
      continue;
    }

    const orgUrlTrimmed = adoOrganizationUrl.endsWith("/")
      ? adoOrganizationUrl.slice(0, -1)
      : adoOrganizationUrl;

    const fetchOptions = {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
      },
    };

    try {
      console.log(`Fetching teams for project ${project.name}...`);
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

      const teamsUrl = `${orgUrlTrimmed}/_apis/projects/${project.adoProjectId}/teams?api-version=7.0`;
      const teamsResponse = await fetch(teamsUrl, fetchOptions);

      if (!teamsResponse.ok) {
        console.error(`Error fetching teams: ${teamsResponse.status}`);
        const errorText = await teamsResponse.text();
        console.error(`Error details: ${errorText}`);
        continue;
      }

      const teamsData = await teamsResponse.json();
      const teamsList = teamsData.value ?? teamsData.teams ?? [];
      console.log(
        `Found ${teamsList.length} teams for project ${project.name}`
      );
      if (teamsList.length === 0) {
        console.log(`No teams found for project ${project.name}, skipping`);
        continue;
      }

      let newMembersAdded = 0;

      for (const team of teamsList) {
        const membersUrl = `${orgUrlTrimmed}/_apis/projects/${project.adoProjectId}/teams/${team.id}/members?api-version=7.0`;

        try {
          console.log(`Fetching members for team ${team.name}...`);
          const membersResponse = await fetch(membersUrl, fetchOptions);

          if (!membersResponse.ok) {
            console.warn(
              `Failed to fetch members for team ${team.name}: ${membersResponse.status}`
            );
            continue;
          }

          const membersData = await membersResponse.json();
          const membersList = membersData.value ?? membersData.members ?? [];
          console.log(
            `Found ${membersList.length} members in team ${team.name}`
          );
          if (membersList.length === 0) {
            console.log(`No members found in team ${team.name}, skipping`);
            continue;
          }

          if (membersList.length > 0) {
            console.log(
              "Sample member data:",
              JSON.stringify(membersList[0], null, 2)
            );
          }

          for (const member of membersList) {
            if (!member.identity) {
              console.log(`Member without identity information, skipping`);
              continue;
            }

            const memberEmail =
              member.identity.uniqueName || member.identity.principalName;
            const memberName = member.identity.displayName;
            const memberAdoId = member.identity.id;

            if (!memberEmail) {
              console.log(
                `Member ${memberName} has no email or principal name, skipping`
              );
              continue;
            }

            console.log(
              `Processing team member: ${memberName} (${memberEmail})`
            );

            // Find or create user
            let user = await findUserByEmailOrAdoId(memberEmail, memberAdoId);

            if (!user) {
              console.log(
                `User ${memberName} (${memberEmail}) does not exist, creating...`
              );
              try {
                user = await createUser({
                  name: memberName,
                  email: memberEmail,
                  adoUserId: memberAdoId,
                  organizationId: adoConnection.organizationId,
                  maxHoursPerWeek: 40,
                  theme: "dark",
                  licenseType: "FREE",
                });
                console.log(`Created new user: ${user.id} (${user.name})`);
              } catch (error) {
                console.error(`Error creating user ${memberName}:`, error);
                continue;
              }
            } else {
              // Update ADO ID if missing
              if (!user.adoUserId && memberAdoId) {
                console.log(
                  `Updating ADO user ID for ${user.name} (${user.id})`
                );
                await usersCol.doc(user.id).update({
                  adoUserId: memberAdoId,
                  updatedAt: new Date(),
                });
              }
            }

            // Check if user is already a member of the project
            // In Firestore, members subcollection uses userId as doc ID
            const memberSnap = await membersCol(project.id).doc(user.id).get();

            if (!memberSnap.exists) {
              console.log(
                `Adding user ${user.name} (${user.email}) to project ${project.name}`
              );

              const now = new Date();
              const memberId = `${user.id}_${project.id}`;

              // Create member + weekly hours in a batch
              const batch = adminDb.batch();

              batch.set(membersCol(project.id).doc(user.id), {
                userId: user.id,
                projectId: project.id,
                role: "MEMBER",
                memberId,
                createdAt: now,
                updatedAt: now,
              });

              const whDocId = `${currentYear}_${currentWeek}`;
              batch.set(weeklyHoursCol(project.id, user.id).doc(whDocId), {
                projectMemberId: memberId,
                year: currentYear,
                weekNumber: currentWeek,
                hours: 10,
                createdAt: now,
                updatedAt: now,
              });

              await batch.commit();

              newMembersAdded++;
              console.log(
                `Successfully added ${user.name} to project ${project.name} with weekly hours record`
              );
            } else {
              console.log(
                `User ${user.name} is already a member of project ${project.name}, checking weekly hours`
              );

              const whDocId = `${currentYear}_${currentWeek}`;
              const whSnap = await weeklyHoursCol(project.id, user.id)
                .doc(whDocId)
                .get();

              if (!whSnap.exists) {
                const memberId = `${user.id}_${project.id}`;
                await weeklyHoursCol(project.id, user.id).doc(whDocId).set({
                  projectMemberId: memberId,
                  year: currentYear,
                  weekNumber: currentWeek,
                  hours: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                console.log(`Added weekly hours record for ${user.name}`);
              }
            }
          }
        } catch (memberError) {
          console.error(`Error processing team ${team.name}:`, memberError);
        }
      }

      console.log(
        `Added ${newMembersAdded} new members to project ${project.name}`
      );
      totalMembersAdded += newMembersAdded;
      processedProjects++;
    } catch (error) {
      console.error(`Error processing project ${project.name}:`, error);
    }
  }

  // Final stats — count members across all projects
  let totalMemberCount = 0;
  const allProjects = await projectsCol.get();
  for (const doc of allProjects.docs) {
    const countSnap = await membersCol(doc.id).count().get();
    totalMemberCount += countSnap.data().count;
  }

  console.log("\nProject member synchronization completed");
  console.log(`Processed ${processedProjects} projects`);
  console.log(`Added ${totalMembersAdded} new members`);
  console.log(`Total ProjectMember records in database: ${totalMemberCount}`);
}

main()
  .then(() => {
    console.log("Script completed.");
  })
  .catch((e) => {
    console.error("Error in script execution:", e);
    process.exit(1);
  });
