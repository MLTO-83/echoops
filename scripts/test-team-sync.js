// Test script to examine why team members aren't being added to the database
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

// The team response data from the refresh action
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

async function testAddTeamMembers() {
  console.log("Starting test to add team members from ADO response...");

  try {
    // Step 1: Find the project in the database by ADO Project ID
    const adoProjectId = teamResponse.teams[0].projectId;
    console.log(`Looking for project with ADO Project ID: ${adoProjectId}`);

    const project = await prisma.project.findFirst({
      where: {
        adoProjectId: adoProjectId,
      },
      include: {
        adoConnection: true,
      },
    });

    if (!project) {
      // Try to find any project to use for testing
      console.log(
        `No project found with ADO Project ID: ${adoProjectId}. Trying to find any project with an ADO connection...`
      );

      const anyProject = await prisma.project.findFirst({
        where: {
          adoConnectionId: {
            not: null,
          },
        },
        include: {
          adoConnection: true,
        },
      });

      if (!anyProject) {
        console.error(
          "Could not find any project with ADO connection. Please create a project first."
        );

        // List all projects for debugging
        const allProjects = await prisma.project.findMany({
          select: {
            id: true,
            name: true,
            adoProjectId: true,
            adoConnectionId: true,
          },
        });

        console.log("Available projects:");
        console.table(allProjects);
        return;
      }

      console.log(
        `Using project: ${anyProject.name} (${anyProject.id}) for testing`
      );
      project = anyProject;
    } else {
      console.log(`Found project: ${project.name} (${project.id})`);
    }

    console.log(`ADO Connection ID: ${project.adoConnectionId}`);

    if (!project.adoConnection) {
      console.error("Project has no ADO connection");
      return;
    }

    const organizationId = project.adoConnection.organizationId;
    console.log(`Organization ID: ${organizationId}`);

    // Step 2: Process each team member
    console.log(
      `\nProcessing ${teamResponse.teams[0].members.length} team members from response...`
    );

    const team = teamResponse.teams[0];
    let membersAdded = 0;

    for (const memberData of team.members) {
      if (!memberData.identity) {
        console.error("Invalid member data, missing identity");
        continue;
      }

      const identity = memberData.identity;
      const displayName = identity.displayName;
      const email = identity.uniqueName;
      const adoId = identity.id;
      const imageUrl = identity.imageUrl;

      console.log(`\nProcessing member: ${displayName} (${email})`);

      // Step 3: Find or create the user
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ email: email }, { adoUserId: adoId }],
        },
      });

      if (!user) {
        console.log(`User not found, creating new user: ${displayName}`);
        try {
          user = await prisma.user.create({
            data: {
              name: displayName,
              email: email,
              adoUserId: adoId,
              image: imageUrl,
              organizationId: organizationId,
              maxHoursPerWeek: 40,
              theme: "dark",
              licenseType: "FREE",
            },
          });
          console.log(`Created user with ID: ${user.id}`);
        } catch (err) {
          console.error(`Error creating user ${displayName}:`, err);

          // Check if the user was created by another process
          user = await prisma.user.findFirst({
            where: {
              OR: [{ email: email }, { adoUserId: adoId }],
            },
          });

          if (!user) {
            console.error(
              `Still couldn't find/create user ${displayName}, skipping`
            );
            continue;
          }

          console.log(`Found user after error: ${user.id}`);
        }
      } else {
        console.log(
          `Found existing user: ${user.name || user.email} (${user.id})`
        );

        // Update ADO ID if needed
        if (!user.adoUserId && adoId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { adoUserId: adoId },
          });
          console.log(`Updated ADO ID for user ${user.id}`);
        }
      }

      // Step 4: Create project member if it doesn't exist
      try {
        const existingMember = await prisma.projectMember.findFirst({
          where: {
            userId: user.id,
            projectId: project.id,
          },
        });

        if (!existingMember) {
          console.log(
            `Creating project member for user ${user.id} in project ${project.id}`
          );

          try {
            const projectMember = await prisma.projectMember.create({
              data: {
                userId: user.id,
                projectId: project.id,
                role: "MEMBER",
              },
            });
            console.log(`Created project member with ID: ${projectMember.id}`);
            membersAdded++;
          } catch (err) {
            console.error(`Error creating project member:`, err);

            // Check if it was created by another process
            const checkMember = await prisma.projectMember.findFirst({
              where: {
                userId: user.id,
                projectId: project.id,
              },
            });

            if (checkMember) {
              console.log(
                `Found project member after error: ${checkMember.id}`
              );
              membersAdded++;
            } else {
              console.error(`Failed to create project member relation`);
            }
          }
        } else {
          console.log(
            `User is already a member of this project (ID: ${existingMember.id})`
          );
        }
      } catch (memberError) {
        console.error(`Error handling project membership:`, memberError);
      }
    }

    // Final check
    console.log(`\n=== TEST RESULTS ===`);
    console.log(`Project: ${project.name} (${project.id})`);
    console.log(`Members processed: ${team.members.length}`);
    console.log(`Members added: ${membersAdded}`);

    const finalCount = await prisma.projectMember.count({
      where: { projectId: project.id },
    });

    console.log(`Total members in project now: ${finalCount}`);
  } catch (error) {
    console.error("Error in test script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAddTeamMembers().catch(console.error);
