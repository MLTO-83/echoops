export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import {
  users,
  projects,
  adoConnections,
  projectMembers,
  projectMemberWeeklyHours,
  createProjectMemberWithWeeklyHours,
} from "@/lib/firebase/db";

// Utility function to encode to Base64
function encodeToBase64(text: string): string {
  return Buffer.from(text).toString("base64");
}

// Helper function for explicit logging
function log(message: string, data: any = null): void {
  const timestamp = new Date().toISOString();
  const prefix = `[ADO-COMPREHENSIVE-SYNC ${timestamp}]`;

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

/**
 * POST /api/ado/comprehensive-sync - Comprehensive fetch of projects and team members
 * This endpoint combines project fetching and member synchronization into a single operation
 */
export async function POST(req: NextRequest) {
  const syncStartTime = Date.now();
  log("Starting comprehensive synchronization");

  try {
    // Get the user session
    const session = await getSession();
    if (!session?.user) {
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

    // Get user's organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      log("User not associated with an organization");
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get ADO connection details
    const adoConnection = await adoConnections.findByOrganizationId(
      user.organizationId
    );

    if (!adoConnection) {
      log("No ADO connection configured");
      return NextResponse.json(
        { error: "No ADO connection configured" },
        { status: 400 }
      );
    }

    // Format the URL properly
    let url = adoConnection.adoOrganizationUrl;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    // STEP 1: Fetch projects from ADO API
    log("Fetching projects from ADO API");
    let adoProjects: any[] = [];
    let projectStats = {
      created: 0,
      updated: 0,
      total: 0,
    };

    try {
      const response = await fetch(`${url}/_apis/projects?api-version=6.0`, {
        headers: {
          Authorization: `Basic ${encodeToBase64(`:${adoConnection.pat}`)}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        log(`ADO API returned status: ${response.status}`);
        return NextResponse.json(
          { error: `Failed to fetch projects: ${response.statusText}` },
          { status: 500 }
        );
      }

      const data = await response.json();
      adoProjects = data.value;
      projectStats.total = adoProjects.length;
      log(`Found ${adoProjects.length} projects in ADO`);

      // Process each ADO project and ensure it exists in our database
      for (const adoProject of adoProjects) {
        try {
          // Check if project exists in database
          const existingProject = await projects.findByAdoProjectId(
            adoProject.id
          );

          if (existingProject) {
            // Update existing project
            await projects.update(existingProject.id, {
              name: adoProject.name,
            });
            log(`Updated project ${adoProject.name} (${adoProject.id})`);
            projectStats.updated++;
          } else {
            // Create new project with proper organization connection
            await projects.create({
              name: adoProject.name,
              adoProjectId: adoProject.id,
              adoConnectionId: adoConnection.id,
              stateId: "in_progress",
            });
            log(`Created project ${adoProject.name} (${adoProject.id})`);
            projectStats.created++;
          }
        } catch (projectErr: any) {
          log(
            `Error processing project ${adoProject.name}: ${projectErr.message}`
          );
        }
      }
    } catch (projectsError: any) {
      log(`Error fetching projects: ${projectsError.message}`);
      return NextResponse.json(
        { error: `Failed to fetch projects: ${projectsError.message}` },
        { status: 500 }
      );
    }

    // STEP 2: Sync team members for all projects
    log("Starting team member synchronization");
    let memberStats = {
      processed: 0,
      added: 0,
      total: 0,
    };

    // Fetch all projects with ADO connections
    const allProjects = await projects.findMany({ adoProjectIdNotNull: true });
    const projectsWithAdo = allProjects.filter((p) => p.adoConnectionId);

    log(
      `Found ${projectsWithAdo.length} projects with ADO connections to process for members`
    );

    // Process each project that has an ADO connection
    for (const project of projectsWithAdo) {
      try {
        log(`Processing project: ${project.name} (${project.id})`);

        // Get the ADO connection for this project
        const projAdoConnection = await adoConnections.findByOrganizationId(
          project.adoConnectionId!
        );

        if (!projAdoConnection) {
          log(`Missing ADO connection for project ${project.name}`);
          continue;
        }

        const { adoOrganizationUrl, pat } = projAdoConnection;

        if (!adoOrganizationUrl || !pat) {
          log(`Missing ADO configuration for project ${project.name}`);
          continue;
        }

        // Format the ADO URL correctly
        const baseUrl = adoOrganizationUrl.endsWith("/")
          ? adoOrganizationUrl.slice(0, -1)
          : adoOrganizationUrl;

        // Step 2.1: Fetch teams for this project
        log(`Fetching teams from ADO for project ${project.adoProjectId}`);
        const teamsUrl = `${baseUrl}/_apis/projects/${project.adoProjectId}/teams?api-version=7.0`;

        const teamsResponse = await fetch(teamsUrl, {
          headers: {
            Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
          },
        });

        if (!teamsResponse.ok) {
          log(`Failed to fetch teams: ${teamsResponse.status}`);
          continue;
        }

        const teamsData = await teamsResponse.json();
        log(
          `Found ${teamsData.value?.length || 0} teams for project ${project.name}`
        );

        if (!teamsData.value || teamsData.value.length === 0) {
          log(`No teams found for project ${project.name}`);
          continue;
        }

        memberStats.processed++;
        const processedMemberKeys = new Set(); // To avoid duplicates

        // Step 2.2: For each team, fetch its members
        for (const team of teamsData.value) {
          try {
            log(`Processing team: ${team.name} (${team.id})`);

            // Fetch team members
            const membersUrl = `${baseUrl}/_apis/projects/${project.adoProjectId}/teams/${team.id}/members?api-version=7.0`;
            const membersResponse = await fetch(membersUrl, {
              headers: {
                Authorization: `Basic ${encodeToBase64(`:${pat}`)}`,
              },
            });

            if (!membersResponse.ok) {
              log(
                `Failed to fetch members for team ${team.name}: ${membersResponse.status}`
              );
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

            // Step 2.3: Process each team member
            for (const member of membersData.value) {
              try {
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

                log(`Processing team member: ${displayName} (${email})`);

                // Step 2.4: Find or create user
                let dbUser = await users.findByEmailOrAdoUserId(email, adoId);

                if (!dbUser) {
                  log(`Creating new user for ${displayName}`);
                  try {
                    dbUser = await users.create({
                      name: displayName,
                      email,
                      adoUserId: adoId,
                      image: imageUrl,
                      organizationId: user.organizationId,
                      maxHoursPerWeek: 40,
                      theme: "dark",
                      licenseType: "FREE",
                    });
                    log(`Created user with ID: ${dbUser.id}`);
                  } catch (createError: any) {
                    log(`Error creating user: ${createError.message}`);
                    // Check if user was created by another concurrent process
                    dbUser = await users.findByEmailOrAdoUserId(email, adoId);
                    if (!dbUser) continue;
                  }
                } else {
                  // Update ADO ID if needed
                  if (!dbUser.adoUserId && adoId) {
                    await users.update(dbUser.id, { adoUserId: adoId });
                  }
                }

                // Step 2.5: Create project member if needed
                try {
                  const existingMember =
                    await projectMembers.findByUserAndProject(
                      dbUser.id,
                      project.id
                    );

                  if (!existingMember) {
                    log(`Adding user ${dbUser.id} as project member`);

                    // Get current week and year
                    const { weekNumber, year } = getCurrentWeekAndYear();

                    try {
                      // Create project member with weekly hours
                      await createProjectMemberWithWeeklyHours({
                        userId: dbUser.id,
                        projectId: project.id,
                        role: "MEMBER",
                        weeklyHours: [
                          {
                            year: year,
                            weekNumber: weekNumber,
                            hours: 0,
                          },
                        ],
                      });

                      memberStats.added++;
                      log(
                        `Created project member for user ${dbUser.id} with weekly hours`
                      );
                    } catch (createError: any) {
                      log(
                        `Error creating project member: ${createError.message}`
                      );

                      // Check if it was created by another process
                      const checkMember =
                        await projectMembers.findByUserAndProject(
                          dbUser.id,
                          project.id
                        );

                      if (!checkMember) {
                        // Try a simpler approach without weekly hours
                        try {
                          await projectMembers.create({
                            userId: dbUser.id,
                            projectId: project.id,
                            role: "MEMBER",
                          });

                          // Then create weekly hours separately
                          await projectMemberWeeklyHours.upsert(
                            project.id,
                            dbUser.id,
                            {
                              year: year,
                              weekNumber: weekNumber,
                              hours: 0,
                            }
                          );

                          memberStats.added++;
                          log(
                            `Created project member (fallback) for user ${dbUser.id}`
                          );
                        } catch (fallbackError: any) {
                          log(
                            `Fallback creation also failed: ${fallbackError.message}`
                          );
                        }
                      }
                    }
                  } else {
                    // Ensure weekly hours exist for existing members
                    const existingHours =
                      await projectMemberWeeklyHours.findByMember(
                        project.id,
                        dbUser.id
                      );

                    if (existingHours.length === 0) {
                      const { weekNumber, year } = getCurrentWeekAndYear();
                      try {
                        await projectMemberWeeklyHours.upsert(
                          project.id,
                          dbUser.id,
                          {
                            year: year,
                            weekNumber: weekNumber,
                            hours: 0,
                          }
                        );
                      } catch (weeklyHoursError: any) {
                        log(
                          `Error creating weekly hours for existing member: ${weeklyHoursError.message}`
                        );
                      }
                    }
                  }
                } catch (memberError: any) {
                  log(
                    `Error handling project membership: ${memberError.message}`
                  );
                }
              } catch (memberProcessError: any) {
                log(`Error processing member: ${memberProcessError.message}`);
              }
            }
          } catch (teamError: any) {
            log(`Error processing team ${team.name}: ${teamError.message}`);
          }
        }
      } catch (projectError: any) {
        log(
          `Error processing project ${project.name}: ${projectError.message}`
        );
      }
    }

    // Get final counts for the summary
    const userCount = await users.count();

    const syncDuration = (Date.now() - syncStartTime) / 1000;
    log(`Comprehensive sync completed in ${syncDuration.toFixed(2)} seconds`);

    return NextResponse.json({
      success: true,
      message: "Successfully synchronized projects and team members.",
      stats: {
        projects: projectStats.total,
        projectsCreated: projectStats.created,
        projectsUpdated: projectStats.updated,
        teams: memberStats.processed,
        members: memberStats.added,
        userCount,
        duration: syncDuration.toFixed(2),
      },
    });
  } catch (error: any) {
    log(`Fatal error: ${error.message}`);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to synchronize: ${error.message || "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
