/**
 * Test script specifically for the MasterData management Team sync
 * This script will trace execution step by step with detailed logging
 */

const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Mock team response from ADO API for MasterData management Team
const mockTeamResponse = {
  success: true,
  count: 1,
  teams: [
    {
      id: "847dc55a-3af7-4e63-9a8b-614341741a9c",
      name: "MasterData management Team",
      url: "https://dev.azure.com/torslev/_apis/projects/d13fd59f-3c26-4e76-97db-364d88ef0ae8/teams/847dc55a-3af7-4e63-9a8b-614341741a9c",
      description: "The default project team.",
      identityUrl:
        "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/847dc55a-3af7-4e63-9a8b-614341741a9c",
      projectName: "MasterData management",
      projectId: "d13fd59f-3c26-4e76-97db-364d88ef0ae8",
      members: [
        {
          identity: {
            displayName: "freja.hansen@torslevhotmail.onmicrosoft.com",
            url: "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/8d2b10ae-510f-4c01-9502-46bb3d84f6c3",
            _links: {
              avatar: {
                href: "https://dev.azure.com/torslev/_apis/GraphProfile/MemberAvatars/bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxmcmVqYS5oYW5zZW5AdG9yc2xldmhvdG1haWwub25taWNyb3NvZnQuY29t",
              },
            },
            id: "8d2b10ae-510f-4c01-9502-46bb3d84f6c3",
            uniqueName: "freja.hansen@torslevhotmail.onmicrosoft.com",
            imageUrl:
              "https://dev.azure.com/torslev/_api/_common/identityImage?id=8d2b10ae-510f-4c01-9502-46bb3d84f6c3",
            descriptor:
              "bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxmcmVqYS5oYW5zZW5AdG9yc2xldmhvdG1haWwub25taWNyb3NvZnQuY29t",
          },
        },
        {
          identity: {
            displayName: "carlos.rivera@torslevhotmail.onmicrosoft.com",
            url: "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/e3acc1eb-1c90-4bb9-a41c-597990f33ae5",
            _links: {
              avatar: {
                href: "https://dev.azure.com/torslev/_apis/GraphProfile/MemberAvatars/bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxjYXJsb3Mucml2ZXJhQHRvcnNsZXZob3RtYWlsLm9ubWljcm9zb2Z0LmNvbQ",
              },
            },
            id: "e3acc1eb-1c90-4bb9-a41c-597990f33ae5",
            uniqueName: "carlos.rivera@torslevhotmail.onmicrosoft.com",
            imageUrl:
              "https://dev.azure.com/torslev/_api/_common/identityImage?id=e3acc1eb-1c90-4bb9-a41c-597990f33ae5",
            descriptor:
              "bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxjYXJsb3Mucml2ZXJhQHRvcnNsZXZob3RtYWlsLm9ubWljcm9zb2Z0LmNvbQ",
          },
        },
        {
          identity: {
            displayName: "priya.sharma@torslevhotmail.onmicrosoft.com",
            url: "https://spsprodneu1.vssps.visualstudio.com/A89a0826e-8a8c-402c-ab48-2461911fd126/_apis/Identities/0a291d27-ef42-414e-bcb2-d424afa48be5",
            _links: {
              avatar: {
                href: "https://dev.azure.com/torslev/_apis/GraphProfile/MemberAvatars/bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxwcml5YS5zaGFybWFAdG9yc2xldmhvdG1haWwub25taWNyb3NvZnQuY29t",
              },
            },
            id: "0a291d27-ef42-414e-bcb2-d424afa48be5",
            uniqueName: "priya.sharma@torslevhotmail.onmicrosoft.com",
            imageUrl:
              "https://dev.azure.com/torslev/_api/_common/identityImage?id=0a291d27-ef42-414e-bcb2-d424afa48be5",
            descriptor:
              "bnd.dXBuOldpbmRvd3MgTGl2ZSBJRFxwcml5YS5zaGFybWFAdG9yc2xldmhvdG1haWwub25taWNyb3NvZnQuY29t",
          },
        },
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
  const prefix = `[MD-TEAM-TEST ${timestamp}]`;

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

async function testMasterDataTeamSync() {
  log("====== STARTING MASTERDATA TEAM SYNC TEST ======");

  try {
    // STEP 1: Check if the MasterData project exists in the database
    const adoProjectId = mockTeamResponse.teams[0].projectId;
    log(`Looking for project with ADO ID: ${adoProjectId}`);

    let project = await prisma.project.findFirst({
      where: { adoProjectId },
      include: { adoConnection: true },
    });

    // If project doesn't exist, we'll create it
    if (!project) {
      log("No matching project found in database. Creating test project.");

      // Get or create ADO connection
      let adoConnection = await prisma.ADOConnection.findFirst();
      if (!adoConnection) {
        // Get organization for the connection
        const organization = await prisma.organization.findFirst();
        if (!organization) {
          log("No organization found - creating one");
          const newOrg = await prisma.organization.create({
            data: { name: "Test Organization" },
          });
          log(`Created organization with id ${newOrg.id}`);

          // Create ADO connection
          adoConnection = await prisma.ADOConnection.create({
            data: {
              adoOrganizationUrl: "https://dev.azure.com/torslev",
              pat: "test-pat", // Just a placeholder for testing
              organizationId: newOrg.id,
            },
          });
        } else {
          // Create ADO connection with existing org
          adoConnection = await prisma.ADOConnection.create({
            data: {
              adoOrganizationUrl: "https://dev.azure.com/torslev",
              pat: "test-pat", // Just a placeholder for testing
              organizationId: organization.id,
            },
          });
        }
        log(`Created ADO connection with id ${adoConnection.id}`);
      }

      // Now create the project
      project = await prisma.project.create({
        data: {
          name: "MasterData management",
          adoProjectId,
          adoConnectionId: adoConnection.id,
        },
        include: {
          adoConnection: true,
        },
      });
      log(`Created project: ${project.name} (${project.id})`);
    } else {
      log(`Found existing project: ${project.name} (${project.id})`);
    }

    // STEP 2: Process team members
    log(`Processing team: ${mockTeamResponse.teams[0].name}`);
    log(
      `Team has ${mockTeamResponse.teams[0].members.length} members to process`
    );

    // Get organization ID for new users
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      log("ERROR: No organization found in database");
      return;
    }

    // Dump current state
    log("CURRENT STATE BEFORE PROCESSING:");
    const existingUsers = await prisma.user.findMany();
    log(`Current users in database: ${existingUsers.length}`);

    const existingMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: true,
        weeklyHours: true,
      },
    });
    log(`Current project members for this project: ${existingMembers.length}`);

    let memberSuccessCount = 0;
    let memberFailCount = 0;

    // Process each team member
    for (const member of mockTeamResponse.teams[0].members) {
      try {
        const { identity } = member;
        const displayName = identity.displayName || "Unknown Member";
        const email = identity.uniqueName || identity.principalName;
        const adoId = identity.id;
        const imageUrl = identity.imageUrl;

        log(`\n--- PROCESSING MEMBER: ${displayName} (${email}) ---`);

        if (!email) {
          log(`Member ${displayName} has no email, skipping`);
          memberFailCount++;
          continue;
        }

        // STEP 3: Find or create the user
        let user = await prisma.user.findFirst({
          where: {
            OR: [{ email: email }, adoId ? { adoUserId: adoId } : {}],
          },
        });

        if (!user) {
          log(`Creating new user for ${displayName}`);
          try {
            user = await prisma.user.create({
              data: {
                name: displayName,
                email,
                adoUserId: adoId,
                image: imageUrl,
                organizationId: organization.id,
                maxHoursPerWeek: 40,
                theme: "dark",
                licenseType: "FREE",
              },
            });
            log(`Created user with ID: ${user.id}`);
          } catch (userError) {
            log(`ERROR creating user: ${userError.message}`);
            memberFailCount++;
            continue;
          }
        } else {
          log(`Found existing user: ${user.name || user.email} (${user.id})`);

          // Update ADO ID if needed
          if (!user.adoUserId && adoId) {
            log(`Updating user with ADO ID: ${adoId}`);
            await prisma.user.update({
              where: { id: user.id },
              data: { adoUserId: adoId },
            });
          }
        }

        // STEP 4: Add user as project member with weekly hours
        try {
          // First, check if already a member
          log(`Checking if user ${user.id} is already a project member`);
          const existingMember = await prisma.projectMember.findFirst({
            where: {
              userId: user.id,
              projectId: project.id,
            },
            include: { weeklyHours: true },
          });

          if (!existingMember) {
            log(`User is not yet a project member - adding now`);

            // Explicitly get current week and year
            const { weekNumber, year } = getCurrentWeekAndYear();
            log(`Using week ${weekNumber} of year ${year} for weekly hours`);

            // Validate inputs before creating
            log(
              `Creating project member with projectId=${project.id}, userId=${user.id}`
            );
            const projectCheck = await prisma.project.findUnique({
              where: { id: project.id },
            });
            const userCheck = await prisma.user.findUnique({
              where: { id: user.id },
            });

            log(
              `Validation: Project exists: ${!!projectCheck}, User exists: ${!!userCheck}`
            );

            if (!projectCheck || !userCheck) {
              throw new Error(
                `Validation failed: Project or User does not exist`
              );
            }

            // STEP 5: Create project member - special debug version
            log("Creating project member with detailed debug info");

            try {
              // First create project member without weekly hours to isolate issues
              const simpleProjectMember = await prisma.projectMember.create({
                data: {
                  userId: user.id,
                  projectId: project.id,
                  role: "MEMBER",
                },
              });

              log(`Created basic project member: ${simpleProjectMember.id}`);

              // Now try to create weekly hours separately
              const weeklyHours = await prisma.projectMemberWeeklyHours.create({
                data: {
                  projectMemberId: simpleProjectMember.id,
                  year: year,
                  weekNumber: weekNumber,
                  hours: 0,
                },
              });

              log(`Created weekly hours: ${weeklyHours.id}`);
              memberSuccessCount++;
            } catch (createError) {
              log(`ERROR creating project member: ${createError.message}`);
              log(`Error details:`, createError);
              memberFailCount++;
            }
          } else {
            log(`User is already a project member (ID: ${existingMember.id})`);

            // Check if weekly hours exist
            if (existingMember.weeklyHours.length === 0) {
              const { weekNumber, year } = getCurrentWeekAndYear();
              log(
                `No weekly hours found, creating for week ${weekNumber}, year ${year}`
              );

              try {
                const weeklyHours =
                  await prisma.projectMemberWeeklyHours.create({
                    data: {
                      projectMemberId: existingMember.id,
                      year: year,
                      weekNumber: weekNumber,
                      hours: 0,
                    },
                  });
                log(`Created weekly hours: ${weeklyHours.id}`);
              } catch (whError) {
                log(`ERROR creating weekly hours: ${whError.message}`);
              }
            } else {
              log(
                `Weekly hours already exist: ${existingMember.weeklyHours.length} entries`
              );
            }
          }
        } catch (memberError) {
          log(
            `CRITICAL ERROR handling project membership: ${memberError.message}`
          );
          log(`Error details:`, memberError);
          memberFailCount++;
        }
      } catch (processingError) {
        log(`FATAL ERROR processing member: ${processingError.message}`);
        memberFailCount++;
      }
    }

    // STEP 6: Verify final results
    log("\n====== FINAL RESULTS ======");
    log(`Successful member additions: ${memberSuccessCount}`);
    log(`Failed member additions: ${memberFailCount}`);

    const updatedMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: true,
        weeklyHours: true,
      },
    });

    log(`Final project member count: ${updatedMembers.length}`);

    if (updatedMembers.length > 0) {
      log("Project members:");
      for (const member of updatedMembers) {
        log(`- ${member.user.name || member.user.email} (${member.id})`);
        log(`  Weekly hours entries: ${member.weeklyHours.length}`);
      }
    } else {
      log("WARNING: No project members found after processing");
    }

    // Check schema and tables
    try {
      log("\nVerifying database tables...");
      const tables = await prisma.$queryRaw`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name IN ('ProjectMember', 'ProjectMemberWeeklyHours')
        ORDER BY table_name, ordinal_position;
      `;
      log("Database schema for related tables:", tables);
    } catch (schemaError) {
      log(`Error checking schema: ${schemaError.message}`);
    }

    log("\n====== TEST COMPLETE ======");
  } catch (error) {
    log(`TEST FAILED with error: ${error.message}`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMasterDataTeamSync()
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  })
  .finally(() => {
    console.log("Test execution completed.");
  });
