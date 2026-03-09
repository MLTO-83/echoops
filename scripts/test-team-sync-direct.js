// Script to test team member sync with the sample team response
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

// The team response data you provided
const teamResponse = {
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

async function testTeamSync() {
  console.log("Starting direct team member sync test");
  console.log("-----------------------------------");

  try {
    console.log(
      "Using Prisma version:",
      require("../prisma/app/generated/prisma/client").Prisma.prismaVersion
    );

    // Step 1: Check database connection and schema
    console.log("\n[Step 1] Testing database connection and schema...");

    try {
      // Check if the tables exist
      const tables = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public'
      `;
      console.log(
        "Database tables:",
        tables.map((t) => t.tablename).join(", ")
      );

      // Check user table structure
      const userColumns = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'User'
      `;
      console.log(
        "User table columns:",
        userColumns.map((c) => `${c.column_name} (${c.data_type})`).join(", ")
      );

      // Check ProjectMember table structure
      const projectMemberColumns = await prisma.$queryRaw`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'ProjectMember'
      `;
      console.log(
        "ProjectMember table columns:",
        projectMemberColumns
          .map((c) => `${c.column_name} (${c.data_type})`)
          .join(", ")
      );
    } catch (err) {
      console.error("Error checking schema:", err);
    }

    // Step 2: Find or create a test project
    console.log("\n[Step 2] Finding projects with ADO connections...");
    let project;

    try {
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

      console.log(`Found ${projects.length} projects with ADO connections`);

      if (projects.length === 0) {
        // Create a test project if none exists
        console.log(
          "No projects with ADO connections found. Creating a test project..."
        );

        // First find or create an organization
        let organization = await prisma.organization.findFirst();
        if (!organization) {
          organization = await prisma.organization.create({
            data: {
              name: "Test Organization",
            },
          });
          console.log("Created test organization:", organization.id);
        }

        // Create an ADO connection
        let adoConnection = await prisma.ADOConnection.findFirst({
          where: { organizationId: organization.id },
        });

        if (!adoConnection) {
          adoConnection = await prisma.ADOConnection.create({
            data: {
              organizationId: organization.id,
              adoOrganizationUrl: "https://dev.azure.com/torslev",
              pat: "dummy-pat-for-testing",
            },
          });
          console.log("Created test ADO connection:", adoConnection.id);
        }

        // Now create a project
        project = await prisma.project.create({
          data: {
            name: "Test Project",
            adoProjectId: teamResponse.teams[0].projectId,
            adoConnectionId: adoConnection.id,
          },
          include: {
            adoConnection: true,
          },
        });

        console.log("Created test project:", project.id);
      } else {
        // Try to find the specific project from the team response
        const adoProjectId = teamResponse.teams[0].projectId;
        const matchingProject = projects.find(
          (p) => p.adoProjectId === adoProjectId
        );

        if (matchingProject) {
          console.log(`Found matching project: ${matchingProject.name}`);
          project = matchingProject;
        } else {
          console.log(
            `No project found with ADO Project ID: ${adoProjectId}. Using first available project.`
          );
          project = projects[0];
        }
      }
    } catch (err) {
      console.error("Error finding/creating project:", err);
      return;
    }

    if (!project) {
      console.error("No suitable project found. Exiting test.");
      return;
    }

    console.log(`Using project: ${project.name} (${project.id})`);
    console.log(`ADO Connection ID: ${project.adoConnectionId}`);
    console.log(`ADO Project ID: ${project.adoProjectId}`);

    const organizationId = project.adoConnection?.organizationId;
    console.log(`Organization ID: ${organizationId}`);

    // Step 3: Process team members
    console.log("\n[Step 3] Processing team members...");
    let membersAdded = 0;
    const team = teamResponse.teams[0];

    for (const memberData of team.members) {
      if (!memberData.identity) {
        console.error("Member missing identity data, skipping");
        continue;
      }

      const { identity } = memberData;
      const displayName = identity.displayName;
      const email = identity.uniqueName;
      const adoId = identity.id;
      const imageUrl = identity.imageUrl;

      console.log(`\nProcessing member: ${displayName} (${email})`);

      // Step 3a: Find or create the user
      let user;
      try {
        user = await prisma.user.findFirst({
          where: {
            OR: [{ email: email }, { adoUserId: adoId }],
          },
        });

        if (!user) {
          console.log(`User not found, creating new user: ${displayName}`);
          user = await prisma.user.create({
            data: {
              name: displayName,
              email: email,
              adoUserId: adoId,
              image: imageUrl,
              organizationId,
              maxHoursPerWeek: 40,
              theme: "dark",
              licenseType: "FREE",
            },
          });
          console.log(`Created user with ID: ${user.id}`);
        } else {
          console.log(
            `Found existing user: ${user.name || user.email} (${user.id})`
          );
        }
      } catch (err) {
        console.error(`Error finding/creating user ${displayName}:`, err);
        continue;
      }

      // Step 3b: Create project member if needed
      try {
        // Check if the project member already exists
        const existingMember = await prisma.projectMember.findUnique({
          where: {
            userId_projectId: {
              userId: user.id,
              projectId: project.id,
            },
          },
        });

        if (existingMember) {
          console.log(`Project member already exists for user ${user.id}`);
          continue; // Skip to next member
        }

        // Create project member using raw SQL to avoid any Prisma client issues
        console.log("Using direct SQL to create project member...");
        try {
          await prisma.$executeRaw`
            INSERT INTO "ProjectMember" ("id", "userId", "projectId", "role", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, ${user.id}, ${project.id}, 'MEMBER', NOW(), NOW())
          `;
          console.log(`Created project member for user ${user.id}`);
          membersAdded++;

          // Find the newly created project member to set up weekly hours
          const newMember = await prisma.projectMember.findFirst({
            where: {
              userId: user.id,
              projectId: project.id,
            },
          });

          if (newMember) {
            // Get current date info for the week number
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentWeek = Math.ceil(
              ((now - new Date(currentYear, 0, 1)) / 86400000 +
                new Date(currentYear, 0, 1).getDay() +
                1) /
                7
            );

            // Create weekly hours entry for the current week
            await prisma.projectMemberWeeklyHours.create({
              data: {
                projectMemberId: newMember.id,
                year: currentYear,
                weekNumber: currentWeek,
                hours: 20, // Default to 20 hours per week
              },
            });
            console.log(
              `Created weekly hours record for project member ${newMember.id}`
            );
          }
        } catch (sqlErr) {
          console.error(`Error with direct SQL insert:`, sqlErr);
        }
      } catch (createErr) {
        console.error(`Error handling project member creation:`, createErr);
      }
    }

    // Step 4: Verify results
    console.log("\n[Step 4] Verifying results...");
    const finalMembers = await prisma.projectMember.findMany({
      where: { projectId: project.id },
      include: { user: true },
    });

    console.log(`\n=== TEST RESULTS ===`);
    console.log(`Project: ${project.name} (${project.id})`);
    console.log(`Members processed: ${team.members.length}`);
    console.log(`Members added in this run: ${membersAdded}`);
    console.log(`Total members in project now: ${finalMembers.length}`);

    // List all project members
    console.log("\nProject members:");
    finalMembers.forEach((member) => {
      console.log(
        `- ${member.user.name || member.user.email} (User ID: ${
          member.userId
        }, Member ID: ${member.id})`
      );
    });
  } catch (error) {
    console.error("Fatal error in test script:", error);
  } finally {
    await prisma.$disconnect();
    console.log("\nTest completed, prisma client disconnected.");
  }
}

// Run the test
testTeamSync()
  .then(() => console.log("Test script execution completed."))
  .catch(console.error);
