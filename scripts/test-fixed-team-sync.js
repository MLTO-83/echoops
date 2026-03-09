/**
 * Test script to verify ADO team sync with the fixed Prisma client
 * Tests the OptCRM Team response directly
 */

// Import the centralized Prisma client
const prisma = require("../prisma/client");

// Define the transaction functions here since we can't easily import the TypeScript module
async function executeTransaction(operations) {
  return prisma.$transaction(async (tx) => {
    return await operations(tx);
  });
}

async function createProjectMemberWithWeeklyHours(data) {
  return executeTransaction(async (tx) => {
    // First, create the project member
    const projectMember = await tx.projectMember.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        role: data.role || "MEMBER",
      },
    });

    // Then create all weekly hours records
    const weeklyHours = await Promise.all(
      data.weeklyHours.map((wh) =>
        tx.projectMemberWeeklyHours.create({
          data: {
            projectMemberId: projectMember.id,
            year: wh.year,
            weekNumber: wh.weekNumber,
            hours: wh.hours,
          },
        })
      )
    );

    // Return combined result
    return {
      ...projectMember,
      weeklyHours,
    };
  });
}

// Team response from ADO API for OptCRM Team
const teamResponse = {
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

// Helper function for formatted logging
function logSection(title) {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title} `);
  console.log("=".repeat(60));
}

// Helper function for standard logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;

  if (data !== null) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Helper function to get current week and year
function getCurrentWeekAndYear() {
  const now = new Date();
  const year = now.getFullYear();

  // Calculate week number (ISO week)
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

  return { weekNumber, year };
}

async function testTeamSync() {
  logSection("STARTING TEAM SYNC TEST");

  try {
    // 1. Check Prisma client connection
    log("Checking database connection...");
    try {
      await prisma.$connect();
      log("Database connection successful!");

      // Verify ProjectMember model structure
      const projectMemberFields = Object.keys(prisma.projectMember.fields);
      log("ProjectMember model fields:", projectMemberFields);

      if (projectMemberFields.includes("hoursPerWeek")) {
        log(
          "❌ ERROR: hoursPerWeek field is still present in the Prisma client model"
        );
        return;
      }

      log("✅ Prisma schema validation passed - hoursPerWeek field not found");
    } catch (connectionError) {
      log("❌ Failed to connect to database:", connectionError.message);
      return;
    }

    // 2. Process the team from the response
    const team = teamResponse.teams[0];
    log(`Processing team: ${team.name}`);

    // 3. Verify or create ADO connection
    log("Verifying ADO connection...");
    let adoConnection = await prisma.ADOConnection.findFirst({
      where: { adoOrganizationUrl: "https://dev.azure.com/torslev" },
    });

    if (!adoConnection) {
      // Find or create an organization
      let organization = await prisma.organization.findFirst();
      if (!organization) {
        log("No organization found, creating one...");
        organization = await prisma.organization.create({
          data: {
            name: "Test Organization",
          },
        });
      }

      // Check for any existing ADO connections for this organization
      const existingOrgConnection = await prisma.ADOConnection.findFirst({
        where: { organizationId: organization.id },
      });

      if (existingOrgConnection) {
        log(
          "Using existing ADO connection for the organization:",
          existingOrgConnection.id
        );
        adoConnection = existingOrgConnection;
      } else {
        // Create ADO connection
        adoConnection = await prisma.ADOConnection.create({
          data: {
            adoOrganizationUrl: "https://dev.azure.com/torslev",
            pat: "test-pat-value",
            organizationId: organization.id,
          },
        });
        log("Created new ADO connection:", adoConnection.id);
      }
    } else {
      log("Found existing ADO connection:", adoConnection.id);
    }

    // 4. Find or create project
    log(`Looking for project: ${team.projectName}`);
    let project = await prisma.project.findFirst({
      where: { adoProjectId: team.projectId },
    });

    if (!project) {
      log("Project not found, creating it...");
      project = await prisma.project.create({
        data: {
          name: team.projectName,
          adoProjectId: team.projectId,
          adoConnectionId: adoConnection.id,
        },
      });
      log("Created project:", project.id);
    } else {
      log("Found existing project:", project.id);
    }

    // 5. Process team members
    log(`Processing ${team.members.length} team members...`);
    let membersProcessed = 0;

    for (const member of team.members) {
      const { identity } = member;
      log(`\nProcessing member: ${identity.displayName}`);

      // Find or create user
      log(`Looking for user with email: ${identity.uniqueName}`);
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identity.uniqueName },
            identity.id ? { adoUserId: identity.id } : {},
          ],
        },
      });

      if (!user) {
        log("User not found, creating new user...");

        // Find an organization for the user
        const organization = await prisma.organization.findFirst();

        if (!organization) {
          log("❌ No organization found, cannot create user!");
          return;
        }

        user = await prisma.user.create({
          data: {
            name: identity.displayName,
            email: identity.uniqueName,
            adoUserId: identity.id,
            image: identity.imageUrl,
            organizationId: organization.id,
            maxHoursPerWeek: 40,
            theme: "dark",
            licenseType: "FREE",
          },
        });
        log("Created user:", user.id);
      } else {
        log("Found existing user:", user.id);

        if (!user.adoUserId && identity.id) {
          log("Updating user with ADO user ID");

          user = await prisma.user.update({
            where: { id: user.id },
            data: { adoUserId: identity.id },
          });
        }
      }

      // 6. KEY TEST: Add user as project member
      log("Checking if user is already a project member...");
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          userId: user.id,
          projectId: project.id,
        },
        include: { weeklyHours: true },
      });

      if (existingMember) {
        log("User is already a project member:", existingMember.id);

        if (existingMember.weeklyHours.length === 0) {
          log("No weekly hours found, adding default hours...");

          const { weekNumber, year } = getCurrentWeekAndYear();

          const weeklyHours = await prisma.projectMemberWeeklyHours.create({
            data: {
              projectMemberId: existingMember.id,
              year,
              weekNumber,
              hours: 0,
            },
          });

          log("Created weekly hours:", weeklyHours.id);
        } else {
          log("Weekly hours found:", existingMember.weeklyHours.length);
        }
      } else {
        log("Creating new project member directly...");
        try {
          // Attempt direct creation without the transaction helper
          // This is more likely to succeed and gives us better debugging
          const newMember = await prisma.projectMember.create({
            data: {
              userId: user.id,
              projectId: project.id,
              role: member.isTeamAdmin ? "ADMIN" : "MEMBER",
            },
            // Explicitly select only the fields we know exist
            select: {
              id: true,
              userId: true,
              projectId: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          log("✅ Successfully created project member:", newMember.id);

          // Now add the weekly hours
          const { weekNumber, year } = getCurrentWeekAndYear();
          const weeklyHours = await prisma.projectMemberWeeklyHours.create({
            data: {
              projectMemberId: newMember.id,
              year,
              weekNumber,
              hours: 0,
            },
          });

          log("✅ Successfully created weekly hours:", weeklyHours.id);
          membersProcessed++;
        } catch (directError) {
          log("❌ Direct create approach failed:", directError);

          if (directError.meta && directError.meta.column) {
            log(`Problem column: ${directError.meta.column}`);
          }
        }
      }
    }

    // 7. Final verification
    logSection("FINAL VERIFICATION");

    const finalMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: {
        user: true,
        weeklyHours: true,
      },
    });

    log(`Project has ${finalMembers.length} members:`);
    for (const member of finalMembers) {
      log(`- ${member.user.name || member.user.email} (${member.id})`);
      log(`  Weekly hours: ${member.weeklyHours.length} records`);
    }

    if (membersProcessed > 0) {
      log(`✅ SUCCESS: ${membersProcessed} members processed successfully!`);
    } else {
      log(`ℹ️ INFO: No new members added (may already exist)`);
    }
  } catch (error) {
    log("❌ Unexpected error:", error);
  } finally {
    await prisma.$disconnect();
    logSection("TEST COMPLETED");
  }
}

// Run the test
testTeamSync().catch(console.error);
