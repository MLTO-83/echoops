/**
 * Test script to verify the ADO team sync functionality
 * using a mock response to isolate the issue
 */

const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

// Mock team response from ADO API
const mockTeamResponse = {
  success: true,
  count: 1,
  teams: [
    {
      id: "f8f38f42-c2d6-4adb-be7f-af76a759b017",
      name: "OptCRM Team",
      url: "https://dev.azure.com/torslev/_apis/projects/38067a79-8d6c-4688-a2f1-eb96e6890daf/teams/f8f38f42-c2d6-4adb-be7f-af76a759b017",
      description: "The default project team.",
      identityUrl:
        "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/f8f38f42-c2d6-4adb-be7f-af76a759b017",
      projectName: "OptCRM",
      projectId: "38067a79-8d6c-4688-a2f1-eb96e6890daf",
      members: [
        {
          isTeamAdmin: true,
          identity: {
            displayName: "Mads Lund Torslev",
            url: "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/d8f78bd6-65fc-6d92-be30-d5e7ea0322c1",
            _links: {
              avatar: {
                href: "https://dev.azure.com/torslev/_apis/GraphProfile/MemberAvatars/msa.ZDhmNzhiZDYtNjVmYy03ZDkyLWJlMzAtZDVlN2VhMDMyMmMx",
              },
            },
            id: "d8f78bd6-65fc-6d92-be30-d5e7ea0322c1",
            uniqueName: "torslev@hotmail.com",
            imageUrl:
              "https://dev.azure.com/torslev/_api/_common/identityImage?id=d8f78bd6-65fc-6d92-be30-d5e7ea0322c1",
            descriptor: "msa.ZDhmNzhiZDYtNjVmYy03ZDkyLWJlMzAtZDVlN2VhMDMyMmMx",
          },
        },
      ],
    },
  ],
};

// Utility function for logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[TEST-ADO-SYNC ${timestamp}]`;

  if (data !== null) {
    console.log(prefix, message, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, message);
  }
}

// Helper function to get current week and year (copied from date-utils to avoid import issues)
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

async function testAdoSync() {
  log("Starting ADO sync test with mock team response");

  try {
    // First, ensure we have a project with the ADO project ID
    const adoProjectId = mockTeamResponse.teams[0].projectId;

    // Check if we have a project with this ADO project ID
    let project = await prisma.project.findFirst({
      where: {
        adoProjectId,
      },
      include: {
        adoConnection: true,
      },
    });

    if (!project) {
      log(`No project found with ADO project ID: ${adoProjectId}`);

      // Create a test project if needed
      log("Creating a test project...");

      // First, ensure we have an ADO connection
      const adoConnection = await prisma.ADOConnection.findFirst();

      if (!adoConnection) {
        log("No ADO connection found in the database");
        log("Creating a test ADO connection...");

        // Create an organization first (required for ADO connection)
        const organization = await prisma.organization.findFirst();

        if (!organization) {
          log("No organization found, creating one...");

          const testOrganization = await prisma.organization.create({
            data: {
              name: "Test Organization",
            },
          });

          log(`Created test organization with ID: ${testOrganization.id}`);

          const testAdoConnection = await prisma.ADOConnection.create({
            data: {
              adoOrganizationUrl: "https://dev.azure.com/torslev",
              pat: "test-pat", // Just a placeholder for testing
              organizationId: testOrganization.id,
            },
          });

          log(`Created test ADO connection with ID: ${testAdoConnection.id}`);

          project = await prisma.project.create({
            data: {
              name: "OptCRM Test",
              adoProjectId,
              adoConnectionId: testAdoConnection.id,
            },
            include: {
              adoConnection: true,
            },
          });
        } else {
          const testAdoConnection = await prisma.ADOConnection.create({
            data: {
              adoOrganizationUrl: "https://dev.azure.com/torslev",
              pat: "test-pat", // Just a placeholder for testing
              organizationId: organization.id,
            },
          });

          log(`Created test ADO connection with ID: ${testAdoConnection.id}`);

          project = await prisma.project.create({
            data: {
              name: "OptCRM Test",
              adoProjectId,
              adoConnectionId: testAdoConnection.id,
            },
            include: {
              adoConnection: true,
            },
          });
        }
      } else {
        project = await prisma.project.create({
          data: {
            name: "OptCRM Test",
            adoProjectId,
            adoConnectionId: adoConnection.id,
          },
          include: {
            adoConnection: true,
          },
        });
      }

      log(`Created test project with ID: ${project.id}`);
    } else {
      log(`Found existing project: ${project.name} (${project.id})`);
    }

    // Process each team in the response
    for (const team of mockTeamResponse.teams) {
      log(`Processing team: ${team.name} (${team.id})`);

      // Process each team member
      for (const member of team.members) {
        try {
          const { identity } = member;
          const displayName = identity.displayName || "Unknown Member";
          const email = identity.uniqueName || identity.principalName;
          const adoId = identity.id;
          const imageUrl = identity.imageUrl;

          if (!email) {
            log(`Member ${displayName} has no email, skipping`);
            continue;
          }

          log(
            `Processing team member: ${displayName} (${email}) with ADO ID: ${adoId}`
          );

          // Find or create user
          let user = await prisma.user.findFirst({
            where: {
              OR: [{ email: email }, adoId ? { adoUserId: adoId } : {}],
            },
          });

          if (!user) {
            log(`Creating new user for ${displayName}`);

            try {
              // Check if we need to assign an organization
              const organization = await prisma.organization.findFirst();

              user = await prisma.user.create({
                data: {
                  name: displayName,
                  email,
                  adoUserId: adoId,
                  image: imageUrl,
                  maxHoursPerWeek: 40,
                  theme: "dark",
                  organizationId: organization?.id,
                  licenseType: "FREE",
                },
              });
              log(`Created user with ID: ${user.id}`);
            } catch (createError) {
              log(`Error creating user: ${createError.message}`);
              continue;
            }
          } else {
            log(`Found existing user: ${user.name || user.email} (${user.id})`);

            // Update ADO ID if needed
            if (!user.adoUserId && adoId) {
              await prisma.user.update({
                where: { id: user.id },
                data: { adoUserId: adoId },
              });
              log(`Updated ADO ID for user ${user.id}`);
            }
          }

          // Now try to create the project member with weekly hours
          const existingMember = await prisma.projectMember.findFirst({
            where: {
              userId: user.id,
              projectId: project.id,
            },
            include: {
              weeklyHours: true,
            },
          });

          if (!existingMember) {
            log(`Adding user ${user.id} as project member`);

            try {
              // Get current week and year
              const { weekNumber: currentWeekNumber, year: currentYear } =
                getCurrentWeekAndYear();

              // Default hours for ADO synced members
              const defaultWeeklyHours = 0;

              // Debug the project before creating the member
              const projectCheck = await prisma.project.findUnique({
                where: { id: project.id },
              });
              log(`Confirmed project exists: ${!!projectCheck ? "YES" : "NO"}`);

              // Debug the user before creating the member
              const userCheck = await prisma.user.findUnique({
                where: { id: user.id },
              });
              log(`Confirmed user exists: ${!!userCheck ? "YES" : "NO"}`);

              log(
                `Creating project member with userId: ${user.id}, projectId: ${project.id}`
              );

              // Try to create the project member WITH weekly hours using nested write
              const projectMember = await prisma.projectMember.create({
                data: {
                  userId: user.id,
                  projectId: project.id,
                  role: "MEMBER",
                  weeklyHours: {
                    create: {
                      year: currentYear,
                      weekNumber: currentWeekNumber,
                      hours: defaultWeeklyHours,
                    },
                  },
                },
                include: {
                  weeklyHours: true,
                },
              });

              log(`Created project member with ID: ${projectMember.id}`);
              log(
                `Weekly hours created: ${
                  projectMember.weeklyHours.length > 0 ? "YES" : "NO"
                }`
              );
            } catch (createError) {
              log(`Error creating project member: ${createError.message}`);
              log(`Error details:`, createError);

              // Check if it was created by another process
              const checkMember = await prisma.projectMember.findFirst({
                where: {
                  userId: user.id,
                  projectId: project.id,
                },
                include: {
                  weeklyHours: {
                    take: 1,
                  },
                },
              });

              if (checkMember) {
                log(`Found project member after error: ${checkMember.id}`);

                // Check if weekly hours exist, if not create them
                if (checkMember.weeklyHours.length === 0) {
                  const { weekNumber: currentWeekNumber, year: currentYear } =
                    getCurrentWeekAndYear();

                  try {
                    await prisma.projectMemberWeeklyHours.create({
                      data: {
                        projectMemberId: checkMember.id,
                        year: currentYear,
                        weekNumber: currentWeekNumber,
                        hours: 0,
                      },
                    });
                    log(
                      `Created missing weekly hours for member ${checkMember.id}`
                    );
                  } catch (weeklyHoursError) {
                    log(
                      `Error creating weekly hours: ${weeklyHoursError.message}`
                    );
                  }
                }
              } else {
                log(`Failed to create project member relation`);

                // Try a different approach - create project member without weekly hours first
                try {
                  log(
                    "Attempting to create project member without nested weekly hours..."
                  );

                  const basicProjectMember = await prisma.projectMember.create({
                    data: {
                      userId: user.id,
                      projectId: project.id,
                      role: "MEMBER",
                    },
                  });

                  log(
                    `Created basic project member with ID: ${basicProjectMember.id}`
                  );

                  // Now try to create weekly hours separately
                  const { weekNumber: currentWeekNumber, year: currentYear } =
                    getCurrentWeekAndYear();

                  const weeklyHours =
                    await prisma.projectMemberWeeklyHours.create({
                      data: {
                        projectMemberId: basicProjectMember.id,
                        year: currentYear,
                        weekNumber: currentWeekNumber,
                        hours: 0,
                      },
                    });

                  log(`Created weekly hours separately: ${weeklyHours.id}`);
                } catch (secondAttemptError) {
                  log(
                    `Second attempt also failed: ${secondAttemptError.message}`
                  );
                }
              }
            }
          } else {
            log(
              `${displayName} is already a member of project ${project.name}`
            );

            // Check if weekly hours exist for this existing member
            if (existingMember.weeklyHours.length === 0) {
              const { weekNumber: currentWeekNumber, year: currentYear } =
                getCurrentWeekAndYear();

              log(
                `Creating missing weekly hours for existing member ${existingMember.id}`
              );
              try {
                await prisma.projectMemberWeeklyHours.create({
                  data: {
                    projectMemberId: existingMember.id,
                    year: currentYear,
                    weekNumber: currentWeekNumber,
                    hours: 0,
                  },
                });
                log(`Created weekly hours for existing member`);
              } catch (weeklyHoursError) {
                log(
                  `Error creating weekly hours for existing member: ${weeklyHoursError.message}`
                );
              }
            } else {
              log(
                `Weekly hours already exist for this member: ${existingMember.weeklyHours.length} records`
              );
            }
          }
        } catch (memberError) {
          log(`Error processing member: ${memberError.message}`);
        }
      }
    }

    // Finally, verify the results
    log("\nVerifying results...");

    // Check if project member was created
    const allProjectMembers = await prisma.projectMember.findMany({
      where: {
        projectId: project.id,
      },
      include: {
        user: true,
        weeklyHours: true,
      },
    });

    log(`Project has ${allProjectMembers.length} members:`);

    for (const member of allProjectMembers) {
      log(`Member: ${member.user.name || member.user.email} (${member.id})`);
      log(`Weekly hours records: ${member.weeklyHours.length}`);

      if (member.weeklyHours.length > 0) {
        for (const hours of member.weeklyHours) {
          log(`Week ${hours.weekNumber}/${hours.year}: ${hours.hours} hours`);
        }
      } else {
        log(`WARNING: No weekly hours records for this member!`);
      }
    }

    log("\nTest completed successfully");
  } catch (error) {
    log(`Test failed with error: ${error.message}`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAdoSync().catch(console.error);
