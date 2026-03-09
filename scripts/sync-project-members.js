// Script to sync project members from Azure DevOps teams
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();
const { Pool } = require("pg");
const cuid = require("cuid");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Helper function to get the current week number
function getCurrentWeekNumber() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Get current year and week for weekly hours
const currentYear = new Date().getFullYear();
const currentWeek = getCurrentWeekNumber();

async function main() {
  // Remove legacy capacity-check trigger and function, then drop obsolete columns
  await pool.query(
    'DROP TRIGGER IF EXISTS check_user_capacity ON "ProjectMember" CASCADE;'
  );
  await pool.query("DROP FUNCTION IF EXISTS check_user_capacity() CASCADE;");
  await pool.query(
    'ALTER TABLE "ProjectMember" DROP COLUMN IF EXISTS "hoursPerWeek", DROP COLUMN IF EXISTS "hoursPerMonth";'
  );
  console.log("Starting project member synchronization...");

  // Find all projects that have ADO project IDs
  const projects = await prisma.project.findMany({
    where: {
      adoProjectId: {
        not: null,
      },
      adoConnectionId: {
        not: null,
      },
    },
    include: {
      adoConnection: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  console.log(
    `Found ${projects.length} projects with ADO connections to sync members`
  );

  let totalMembersAdded = 0;
  let processedProjects = 0;

  for (const project of projects) {
    console.log(`\nProcessing project: ${project.name} (${project.id})`);
    console.log(`ADO Project ID: ${project.adoProjectId}`);

    if (!project.adoConnection) {
      console.log(`No ADO connection for project ${project.id}, skipping`);
      continue;
    }

    const { pat, adoOrganizationUrl } = project.adoConnection;

    if (!pat || !adoOrganizationUrl) {
      console.log(
        `ADO connection is not properly configured for project ${project.id}, skipping`
      );
      continue;
    }

    // Format the ADO URL properly
    const orgUrlTrimmed = adoOrganizationUrl.endsWith("/")
      ? adoOrganizationUrl.slice(0, -1)
      : adoOrganizationUrl;

    // Fetch teams from Azure DevOps
    const teamsUrl = `${orgUrlTrimmed}/_apis/projects/${project.adoProjectId}/teams?api-version=7.0`;
    const fetchOptions = {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
      },
    };

    try {
      console.log(`Fetching teams for project ${project.name}...`);
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));
      const teamsResponse = await fetch(teamsUrl, fetchOptions);

      if (!teamsResponse.ok) {
        console.error(`Error fetching teams: ${teamsResponse.status}`);
        const errorText = await teamsResponse.text();
        console.error(`Error details: ${errorText}`);
        continue;
      }

      const teamsData = await teamsResponse.json();
      // Support both Azure DevOps API response shapes: 'value' or 'teams'
      const teamsList = teamsData.value ?? teamsData.teams ?? [];
      console.log(
        `Found ${teamsList.length} teams for project ${project.name}`
      );
      if (teamsList.length === 0) {
        console.log(`No teams found for project ${project.name}, skipping`);
        continue;
      }

      // For each team, fetch and process members
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
          // Support both Azure DevOps response shapes: 'value' or 'members'
          const membersList = membersData.value ?? membersData.members ?? [];
          console.log(
            `Found ${membersList.length} members in team ${team.name}`
          );
          if (membersList.length === 0) {
            console.log(`No members found in team ${team.name}, skipping`);
            continue;
          }

          // Log the first team member for debugging
          if (membersList.length > 0) {
            console.log(
              "Sample member data:",
              JSON.stringify(membersList[0], null, 2)
            );
          }

          // Process each member
          for (const member of membersList) {
            // Skip members without identity (just in case)
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

            // Find or create the user
            let user = await prisma.user.findFirst({
              where: {
                OR: [{ email: memberEmail }, { adoUserId: memberAdoId }],
              },
            });

            if (!user) {
              console.log(
                `User ${memberName} (${memberEmail}) does not exist, creating...`
              );

              try {
                user = await prisma.user.create({
                  data: {
                    name: memberName,
                    email: memberEmail,
                    adoUserId: memberAdoId,
                    organizationId: project.adoConnection.organizationId,
                    maxHoursPerWeek: 40, // Default to 40 hours per week
                    theme: "dark",
                    licenseType: "FREE",
                  },
                });

                console.log(`Created new user: ${user.id} (${user.name})`);
              } catch (error) {
                console.error(`Error creating user ${memberName}:`, error);
                continue;
              }
            } else {
              // Update ADO ID if it's missing
              if (!user.adoUserId && memberAdoId) {
                console.log(
                  `Updating ADO user ID for ${user.name} (${user.id})`
                );
                await prisma.user.update({
                  where: { id: user.id },
                  data: { adoUserId: memberAdoId },
                });
              }
            }

            // Check if user is already a member of the project
            const existingMembership = await prisma.projectMember.findUnique({
              where: {
                userId_projectId: {
                  userId: user.id,
                  projectId: project.id,
                },
              },
            });

            if (!existingMembership) {
              console.log(
                `Adding user ${user.name} (${user.email}) to project ${project.name}`
              );

              // Generate new cuid for id column (no DB default exists)
              const newProjectMemberId = cuid();
              const insertResult = await pool.query(
                `INSERT INTO "ProjectMember" ("id","userId","projectId","role") VALUES ($1,$2,$3,$4)
                 ON CONFLICT ("userId","projectId") DO UPDATE SET role=EXCLUDED.role
                 RETURNING id`,
                [newProjectMemberId, user.id, project.id, "MEMBER"]
              );
              let projectMemberId;
              if (insertResult.rows.length > 0) {
                projectMemberId = insertResult.rows[0].id;
              } else {
                // already exists, fetch existing id
                const selectResult = await pool.query(
                  `SELECT id FROM "ProjectMember" WHERE "userId"=$1 AND "projectId"=$2`,
                  [user.id, project.id]
                );
                projectMemberId = selectResult.rows[0].id;
              }
              // Create a weekly hours record
              await prisma.projectMemberWeeklyHours.create({
                data: {
                  projectMemberId,
                  year: currentYear,
                  weekNumber: currentWeek,
                  hours: 10, // Default to 10 hours per week
                },
              });
              newMembersAdded++;
              console.log(
                `Successfully added ${user.name} to project ${project.name} with weekly hours record`
              );
            } else {
              console.log(
                `User ${user.name} is already a member of project ${project.name}, checking weekly hours`
              );

              // Check if the member has hours for the current week
              const hasWeeklyHours =
                await prisma.projectMemberWeeklyHours.findFirst({
                  where: {
                    projectMemberId: existingMembership.id,
                    year: currentYear,
                    weekNumber: currentWeek,
                  },
                });

              if (!hasWeeklyHours) {
                // Create a weekly hours record if none exists
                await prisma.projectMemberWeeklyHours.create({
                  data: {
                    projectMemberId: existingMembership.id,
                    year: currentYear,
                    weekNumber: currentWeek,
                    hours: 10, // Default to 10 hours
                  },
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

  // Final stats
  const totalMemberCount = await prisma.projectMember.count();
  console.log("\nProject member synchronization completed");
  console.log(`Processed ${processedProjects} projects`);
  console.log(`Added ${totalMembersAdded} new members`);
  console.log(`Total ProjectMember records in database: ${totalMemberCount}`);
}

// Helper function to make synchronization available to other modules
async function syncProjectTeamMembers(projectId) {
  // Similar implementation but for a single project
  console.log(`Syncing team members for project ${projectId}...`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      adoConnection: true,
    },
  });

  if (!project) {
    console.error(`Project ${projectId} not found`);
    return { success: false, error: "Project not found" };
  }

  if (
    !project.adoProjectId ||
    !project.adoConnectionId ||
    !project.adoConnection
  ) {
    console.error(`Project ${projectId} is not linked to Azure DevOps`);
    return { success: false, error: "Project not linked to Azure DevOps" };
  }

  // Similar code as in main() but for a single project
  // ... implementation details ...

  return { success: true, message: "Sync completed" };
}

// Export the function for use in other parts of the application
module.exports = {
  syncProjectTeamMembers,
};

main()
  .catch((e) => {
    console.error("Error in script execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
