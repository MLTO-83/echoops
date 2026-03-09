import { NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import {
  users,
  organizations,
  projects,
  adoConnections,
  projectMembers,
  projectMemberWeeklyHours,
  states,
  createProjectMemberWithWeeklyHours,
} from "@/lib/firebase/db";

// Utility function to encode to Base64
function encodeToBase64(text) {
  return Buffer.from(text).toString("base64");
}

// Helper function for explicit logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[ADO-SYNC-MEMBERS ${timestamp}]`;

  if (data !== null) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

// Helper function to get current week and year
function getCurrentWeekAndYear() {
  const now = new Date();
  const year = now.getFullYear();

  // Calculate week number (ISO week)
  const start = new Date(year, 0, 1);
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

  return { weekNumber, year };
}

// Helper function to ensure States are seeded
async function ensureStatesSeeded() {
  const statesCount = await states.count();

  if (statesCount === 0) {
    log("States table is empty, seeding states...");

    // State definitions from project_state.md
    const stateList = [
      {
        id: "new",
        name: "New",
        description: "The project is created but not yet approved.",
      },
      {
        id: "approved",
        name: "Approved",
        description: "The project is approved and ready to start.",
      },
      {
        id: "in_progress",
        name: "In Progress",
        description: "The project is active and ongoing.",
      },
      {
        id: "in_production",
        name: "In Production",
        description:
          "The project has been completed and the result is now live (e.g., a system in use).",
      },
      {
        id: "closed",
        name: "Closed",
        description: "The project is officially closed and archived.",
      },
      {
        id: "on_hold",
        name: "On Hold",
        description: "The project is temporarily paused.",
      },
      {
        id: "cancelled",
        name: "Cancelled",
        description: "The project has been stopped before completion.",
      },
    ];

    // Insert the states
    for (const state of stateList) {
      await states.upsert(state.id, {
        name: state.name,
        description: state.description,
      });
    }

    log("States table seeded successfully");
    return true;
  }
  return false;
}

export async function POST(req) {
  log("Starting team member synchronization");

  try {
    // Ensure required tables are populated
    const statesSeeded = await ensureStatesSeeded();
    if (statesSeeded) {
      log("Successfully seeded States table with default values");
    }

    // Get the user session
    const session = await getSession();
    if (!session || !session.user) {
      log("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log(`Authenticated user: ${session.user.email}`);

    // Parse request body
    let body;
    try {
      body = await req.json();
      log("Request body", body);
    } catch (e) {
      log("No request body or invalid JSON");
      body = {};
    }

    // Fetch all projects with ADO connections
    const allProjects = await projects.findMany({ adoProjectIdNotNull: true });
    // Filter to only projects that have an adoConnectionId
    const projectsWithAdo = allProjects.filter((p) => p.adoConnectionId);

    log(`Found ${projectsWithAdo.length} projects with ADO connections`);

    if (projectsWithAdo.length === 0) {
      // Check if there are any projects at all
      const totalProjects = allProjects.length;
      if (totalProjects === 0) {
        log(
          "No projects found in the database. Please create at least one project first."
        );
        return NextResponse.json(
          {
            error:
              "No projects found in the database. Please create at least one project first.",
            success: false,
          },
          { status: 400 }
        );
      } else {
        // Projects exist but none have ADO connections
        log(
          "No projects with ADO connections found. Please set up ADO connections for your projects."
        );
        return NextResponse.json(
          {
            error:
              "No projects with ADO connections found. Please set up ADO connections for your projects.",
            success: false,
          },
          { status: 400 }
        );
      }
    }

    // Get current user's organization
    const user = await users.findByEmail(session.user.email as string);

    // Using the organizationId from the current user if available
    let userOrgId = user?.organizationId;

    if (!userOrgId) {
      log("Current user has no organization ID");

      // Create organization for user if missing
      const newOrg = await organizations.create({
        name: `${session.user.name || "User"}'s Organization`,
      });

      // Update user with new organization ID
      if (user) {
        await users.update(user.id, { organizationId: newOrg.id });
      }

      userOrgId = newOrg.id;

      log(
        `Created new organization ${newOrg.name} (${newOrg.id}) for user ${session.user.email}`
      );
    }

    let totalMembersAdded = 0;
    let processedProjects = 0;
    let failedProjects = 0;

    // Track current progress to show a meaningful response
    let currentProgress = 0;
    const totalSteps = projectsWithAdo.length;

    // Process each project that has ADO connection
    for (const project of projectsWithAdo) {
      try {
        log(`Processing project: ${project.name} (${project.id})`);
        currentProgress++;

        // Get the ADO connection for this project
        const adoConnection = await adoConnections.findByOrganizationId(
          project.adoConnectionId!
        );

        if (!adoConnection) {
          log(`Missing ADO connection for project ${project.name}`);
          failedProjects++;
          continue;
        }

        const { adoOrganizationUrl, pat } = adoConnection;

        // Ensure the project has a valid state
        if (!project.stateId) {
          await projects.update(project.id, { stateId: "in_progress" });
          log(
            `Updated project ${project.name} with default state 'in_progress'`
          );
        }

        const effectiveOrgId = userOrgId || adoConnection.organizationId;

        if (!adoOrganizationUrl || !pat) {
          log(`Missing ADO configuration for project ${project.name}`);
          failedProjects++;
          continue;
        }

        // Format the ADO URL correctly
        const baseUrl = adoOrganizationUrl.endsWith("/")
          ? adoOrganizationUrl.slice(0, -1)
          : adoOrganizationUrl;

        // Step 1: Fetch teams for this project
        log(`Fetching teams from ADO for project ${project.adoProjectId}`);
        const teamsUrl = `${baseUrl}/_apis/projects/${project.adoProjectId}/teams?api-version=7.0`;

        const teamsResponse = await fetch(teamsUrl, {
          headers: {
            Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
          },
        });

        if (!teamsResponse.ok) {
          log(`Failed to fetch teams: ${teamsResponse.status}`);
          failedProjects++;
          continue;
        }

        const teamsData = await teamsResponse.json();
        log(
          `Teams API response status: ${teamsResponse.status}, found ${
            teamsData.value?.length || 0
          } teams`
        );

        if (!teamsData.value || teamsData.value.length === 0) {
          log(`No teams found for project ${project.name}`);
          processedProjects++; // Increment processed projects even if no teams found
          continue;
        }

        // Step 2: For each team, fetch its members
        let projectMembersAdded = 0;
        const processedMemberKeys = new Set(); // To avoid duplicates

        for (const team of teamsData.value) {
          try {
            log(`Processing team: ${team.name} (${team.id})`);

            // Fetch team members
            const membersUrl = `${baseUrl}/_apis/projects/${project.adoProjectId}/teams/${team.id}/members?api-version=7.0`;
            log(`Fetching members from: ${membersUrl}`);

            const membersResponse = await fetch(membersUrl, {
              headers: {
                Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
              },
            });

            if (!membersResponse.ok) {
              log(`Failed to fetch members: ${membersResponse.status}`);
              continue;
            }

            const membersData = await membersResponse.json();

            if (!membersData.value || membersData.value.length === 0) {
              log(`No members found for team ${team.name}`);
              continue;
            }

            log(
              `Found ${membersData.value.length} members in team ${team.name}`
            );

            // Process each team member
            for (const member of membersData.value) {
              try {
                // Skip if identity data is missing
                if (!member.identity) {
                  log(
                    `Missing identity data for a member in team ${team.name}`
                  );
                  continue;
                }

                const { identity } = member;
                const displayName = identity.displayName || "Unknown Member";
                const email = identity.uniqueName || identity.principalName;
                const adoId = identity.id;
                const imageUrl = identity.imageUrl;

                if (!email) {
                  log(`Member ${displayName} has no email, skipping`);
                  continue;
                }

                // Skip if already processed
                const memberKey = `${email}-${project.id}`;
                if (processedMemberKeys.has(memberKey)) {
                  log(`Already processed ${email} for this project, skipping`);
                  continue;
                }
                processedMemberKeys.add(memberKey);

                log(
                  `Processing team member: ${displayName} (${email}) with ADO ID: ${adoId}`
                );

                // Step 3: Find or create user
                let dbUser = await users.findByEmailOrAdoUserId(email, adoId);

                if (!dbUser) {
                  log(`Creating new user for ${displayName}`);

                  try {
                    dbUser = await users.create({
                      name: displayName,
                      email,
                      adoUserId: adoId,
                      image: imageUrl,
                      organizationId: effectiveOrgId,
                      maxHoursPerWeek: 40,
                      theme: "dark",
                      licenseType: "FREE",
                    });
                    log(`Created user with ID: ${dbUser.id}`);
                  } catch (createError) {
                    log(`Error creating user: ${createError.message}`);

                    // Check if user was created by another concurrent process
                    dbUser = await users.findByEmailOrAdoUserId(email, adoId);

                    if (!dbUser) {
                      log(
                        `Still couldn't find/create user ${displayName}, skipping`
                      );
                      continue;
                    }

                    log(`Found user after error: ${dbUser.id}`);
                  }
                } else {
                  log(
                    `Found existing user: ${dbUser.name || dbUser.email} (${
                      dbUser.id
                    })`
                  );

                  // Update ADO ID if needed
                  if (!dbUser.adoUserId && adoId) {
                    await users.update(dbUser.id, { adoUserId: adoId });
                    log(`Updated ADO ID for user ${dbUser.id}`);
                  }
                }

                // Step 4: Create project member if needed
                try {
                  const existingMember =
                    await projectMembers.findByUserAndProject(
                      dbUser.id,
                      project.id
                    );

                  if (!existingMember) {
                    log(`Adding user ${dbUser.id} as project member`);

                    try {
                      // Get current week and year
                      const {
                        weekNumber: currentWeekNumber,
                        year: currentYear,
                      } = getCurrentWeekAndYear();

                      // Create project member with weekly hours
                      const newMember =
                        await createProjectMemberWithWeeklyHours({
                          userId: dbUser.id,
                          projectId: project.id,
                          role: "MEMBER",
                          weeklyHours: [
                            {
                              year: currentYear,
                              weekNumber: currentWeekNumber,
                              hours: 0,
                            },
                          ],
                        });

                      log(
                        `Created project member with ID: ${newMember.id} and added weekly hours record`
                      );
                      projectMembersAdded++;
                    } catch (createError) {
                      log(
                        `Error creating project member: ${createError.message}`,
                        createError
                      );

                      // Try non-nested approach as fallback
                      try {
                        log("Trying non-nested approach as fallback");

                        // First create project member
                        const newMember = await projectMembers.create({
                          userId: dbUser.id,
                          projectId: project.id,
                          role: "MEMBER",
                        });

                        log(
                          `Created project member with ID: ${newMember.id} using fallback`
                        );

                        // Then create weekly hours separately
                        const {
                          weekNumber: currentWeekNumber,
                          year: currentYear,
                        } = getCurrentWeekAndYear();

                        await projectMemberWeeklyHours.upsert(
                          project.id,
                          dbUser.id,
                          {
                            year: currentYear,
                            weekNumber: currentWeekNumber,
                            hours: 0,
                          }
                        );

                        log(
                          `Created weekly hours for member ${newMember.id}`
                        );
                        projectMembersAdded++;
                      } catch (fallbackError) {
                        log(
                          `Fallback approach also failed: ${fallbackError.message}`
                        );

                        // Check if it was created by another process
                        const checkMember =
                          await projectMembers.findByUserAndProject(
                            dbUser.id,
                            project.id
                          );

                        if (checkMember) {
                          log(
                            `Found project member after error: ${checkMember.id}`
                          );

                          // Check if weekly hours exist, if not create them
                          const existingHours =
                            await projectMemberWeeklyHours.findByMember(
                              project.id,
                              dbUser.id
                            );

                          if (existingHours.length === 0) {
                            const {
                              weekNumber: currentWeekNumber,
                              year: currentYear,
                            } = getCurrentWeekAndYear();

                            try {
                              await projectMemberWeeklyHours.upsert(
                                project.id,
                                dbUser.id,
                                {
                                  year: currentYear,
                                  weekNumber: currentWeekNumber,
                                  hours: 0,
                                }
                              );
                              log(
                                `Created missing weekly hours for member ${checkMember.id}`
                              );
                            } catch (weeklyHoursError) {
                              log(
                                `Error creating weekly hours: ${weeklyHoursError.message}`
                              );
                            }
                          }

                          projectMembersAdded++;
                        } else {
                          log(`Failed to create project member relation`);
                        }
                      }
                    }
                  } else {
                    log(
                      `${displayName} is already a member of project ${project.name}`
                    );

                    // Ensure weekly hours exist for existing members
                    const existingHours =
                      await projectMemberWeeklyHours.findByMember(
                        project.id,
                        dbUser.id
                      );

                    if (existingHours.length === 0) {
                      const {
                        weekNumber: currentWeekNumber,
                        year: currentYear,
                      } = getCurrentWeekAndYear();

                      log(
                        `Creating missing weekly hours for existing member ${existingMember.id}`
                      );
                      try {
                        await projectMemberWeeklyHours.upsert(
                          project.id,
                          dbUser.id,
                          {
                            year: currentYear,
                            weekNumber: currentWeekNumber,
                            hours: 0,
                          }
                        );
                        log(`Created weekly hours for existing member`);
                      } catch (weeklyHoursError) {
                        log(
                          `Error creating weekly hours for existing member: ${weeklyHoursError.message}`
                        );
                      }
                    }
                  }
                } catch (memberError) {
                  log(
                    `Error handling project membership: ${memberError.message}`,
                    memberError
                  );
                }
              } catch (memberProcessError) {
                log(
                  `Error processing member: ${memberProcessError.message}`,
                  memberProcessError
                );
              }
            }
          } catch (teamError) {
            log(
              `Error processing team ${team.name}: ${teamError.message}`,
              teamError
            );
          }
        }

        log(`Added ${projectMembersAdded} members to project ${project.name}`);
        totalMembersAdded += projectMembersAdded;
        processedProjects++;
      } catch (projectError) {
        log(
          `Error processing project ${project.name}: ${projectError.message}`,
          projectError
        );
        failedProjects++;
      }
    }

    // Get final counts for the summary
    // Note: In Firestore we can't easily count all project members across all projects,
    // so we count users as a proxy
    const userCount = await users.count();

    log(
      `Sync completed: Added ${totalMembersAdded} members across ${processedProjects} projects`
    );
    log(`Final counts - Users: ${userCount}`);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized team members for ${processedProjects} projects.`,
      stats: {
        totalProjects: projectsWithAdo.length,
        processedProjects,
        failedProjects,
        totalMembersAdded,
        userCount,
      },
      progress: {
        current: currentProgress,
        total: totalSteps,
        percentage:
          totalSteps > 0
            ? Math.round((currentProgress / totalSteps) * 100)
            : 100,
      },
    });
  } catch (error) {
    log(`Fatal error: ${error.message}`, error);
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to synchronize team members: ${
          error.message || "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
