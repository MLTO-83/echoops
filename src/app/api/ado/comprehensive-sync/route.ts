export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

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
    const session = await getServerSession(authOptions);
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
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { organizationId: true },
    });

    if (!user || !user.organizationId) {
      log("User not associated with an organization");
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findUnique({
      where: { organizationId: user.organizationId },
    });

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
    let adoProjects = [];
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
          const existingProject = await prisma.project.findFirst({
            where: { adoProjectId: adoProject.id },
          });

          if (existingProject) {
            // Update existing project
            await prisma.project.update({
              where: { id: existingProject.id },
              data: {
                name: adoProject.name,
                // Only update fields that are in the Project model schema
              },
            });
            log(`Updated project ${adoProject.name} (${adoProject.id})`);
            projectStats.updated++;
          } else {
            // Create new project with proper organization connection
            await prisma.project.create({
              data: {
                name: adoProject.name,
                adoProjectId: adoProject.id,
                adoConnectionId: adoConnection.id,
                // Use 'approved' state instead of 'new' for projects from ADO
                // This ensures they immediately appear as approved projects in the UI
                stateId: "in_progress",
              },
            });
            log(`Created project ${adoProject.name} (${adoProject.id})`);
            projectStats.created++;
          }
        } catch (projectErr) {
          log(
            `Error processing project ${adoProject.name}: ${projectErr.message}`
          );
        }
      }
    } catch (projectsError) {
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
      },
    });

    log(
      `Found ${projects.length} projects with ADO connections to process for members`
    );

    // Process each project that has an ADO connection
    for (const project of projects) {
      try {
        log(`Processing project: ${project.name} (${project.id})`);

        const { adoOrganizationUrl, pat } = project.adoConnection;

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
        const processedMembers = new Set(); // To avoid duplicates

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
                if (processedMembers.has(memberKey)) {
                  log(`Already processed ${email} for this project, skipping`);
                  continue;
                }
                processedMembers.add(memberKey);

                log(`Processing team member: ${displayName} (${email})`);

                // Step 2.4: Find or create user
                let dbUser = await prisma.user.findFirst({
                  where: {
                    OR: [{ email: email }, adoId ? { adoUserId: adoId } : {}],
                  },
                });

                if (!dbUser) {
                  log(`Creating new user for ${displayName}`);
                  try {
                    dbUser = await prisma.user.create({
                      data: {
                        name: displayName,
                        email,
                        adoUserId: adoId,
                        image: imageUrl,
                        organizationId: user.organizationId,
                        maxHoursPerWeek: 40,
                        theme: "dark",
                        licenseType: "FREE",
                      },
                    });
                    log(`Created user with ID: ${dbUser.id}`);
                  } catch (createError) {
                    log(`Error creating user: ${createError.message}`);
                    // Check if user was created by another concurrent process
                    dbUser = await prisma.user.findFirst({
                      where: {
                        OR: [
                          { email: email },
                          adoId ? { adoUserId: adoId } : {},
                        ],
                      },
                    });
                    if (!dbUser) continue;
                  }
                } else {
                  // Update ADO ID if needed
                  if (!dbUser.adoUserId && adoId) {
                    await prisma.user.update({
                      where: { id: dbUser.id },
                      data: { adoUserId: adoId },
                    });
                  }
                }

                // Step 2.5: Create project member if needed
                try {
                  const existingMember = await prisma.projectMember.findFirst({
                    where: {
                      userId: dbUser.id,
                      projectId: project.id,
                    },
                    include: {
                      weeklyHours: true,
                    },
                  });

                  if (!existingMember) {
                    log(`Adding user ${dbUser.id} as project member`);

                    // Get current week and year
                    const { weekNumber, year } = getCurrentWeekAndYear();

                    try {
                      // Create project member with weekly hours in a single operation
                      await prisma.projectMember.create({
                        data: {
                          userId: dbUser.id,
                          projectId: project.id,
                          role: "MEMBER",
                          // Create weekly hours entry for the current week
                          weeklyHours: {
                            create: {
                              year: year,
                              weekNumber: weekNumber,
                              hours: 0, // Start with 0 hours allocation by default
                            },
                          },
                        },
                      });

                      memberStats.added++;
                      log(
                        `Created project member for user ${dbUser.id} with weekly hours`
                      );
                    } catch (createError) {
                      log(
                        `Error creating project member: ${createError.message}`
                      );

                      // Check if it was created by another process
                      const checkMember = await prisma.projectMember.findFirst({
                        where: {
                          userId: dbUser.id,
                          projectId: project.id,
                        },
                      });

                      if (!checkMember) {
                        // Try a simpler approach without the nested write
                        try {
                          const projectMember =
                            await prisma.projectMember.create({
                              data: {
                                userId: dbUser.id,
                                projectId: project.id,
                                role: "MEMBER",
                              },
                            });

                          // Then create weekly hours separately
                          await prisma.projectMemberWeeklyHours.create({
                            data: {
                              projectMemberId: projectMember.id,
                              year: year,
                              weekNumber: weekNumber,
                              hours: 0,
                            },
                          });

                          memberStats.added++;
                          log(
                            `Created project member (fallback) for user ${dbUser.id}`
                          );
                        } catch (fallbackError) {
                          log(
                            `Fallback creation also failed: ${fallbackError.message}`
                          );
                        }
                      }
                    }
                  } else {
                    // Ensure weekly hours exist for existing members
                    if (existingMember.weeklyHours.length === 0) {
                      const { weekNumber, year } = getCurrentWeekAndYear();
                      try {
                        await prisma.projectMemberWeeklyHours.create({
                          data: {
                            projectMemberId: existingMember.id,
                            year: year,
                            weekNumber: weekNumber,
                            hours: 0,
                          },
                        });
                      } catch (weeklyHoursError) {
                        log(
                          `Error creating weekly hours for existing member: ${weeklyHoursError.message}`
                        );
                      }
                    }
                  }
                } catch (memberError) {
                  log(
                    `Error handling project membership: ${memberError.message}`
                  );
                }
              } catch (memberProcessError) {
                log(`Error processing member: ${memberProcessError.message}`);
              }
            }
          } catch (teamError) {
            log(`Error processing team ${team.name}: ${teamError.message}`);
          }
        }
      } catch (projectError) {
        log(
          `Error processing project ${project.name}: ${projectError.message}`
        );
      }
    }

    // Get final counts for the summary
    memberStats.total = await prisma.projectMember.count();
    const userCount = await prisma.user.count();

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
        totalMembers: memberStats.total,
        userCount,
        duration: syncDuration.toFixed(2),
      },
    });
  } catch (error) {
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
