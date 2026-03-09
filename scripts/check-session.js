// Script to look up the user associated with a session token
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function checkSessionToken(sessionToken) {
  try {
    console.log(`Looking up session with token: ${sessionToken}`);

    // Find the session in the database
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    if (!session) {
      console.log(
        "No session found with this token. The token may be invalid or expired."
      );
      return;
    }

    console.log("Session found:");
    console.log(`- Session ID: ${session.id}`);
    console.log(`- Expires: ${session.expires}`);

    if (session.user) {
      console.log("\nAssociated user:");
      console.log(`- User ID: ${session.user.id}`);
      console.log(`- Name: ${session.user.name}`);
      console.log(`- Email: ${session.user.email}`);

      // Check if this user has access to the project
      const projectId = "cm9s8ufq00000qbcw3fq4egle";
      const projectAccess = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: session.user.id,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      });

      if (projectAccess) {
        console.log(
          `\nUser HAS access to project: ${projectAccess.project.name} (${projectId})`
        );
        console.log(`Role: ${projectAccess.role}`);
      } else {
        console.log(`\nUser DOES NOT have access to project: ${projectId}`);

        // Offer to add the user to the project
        console.log("\nWould you like to add this user to the project?");
        console.log("If so, run: node scripts/add-user-to-project.js");
        console.log(
          `and make sure the email in that script is set to: ${session.user.email}`
        );
      }
    } else {
      console.log("No user associated with this session.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// The session token from your request
const sessionToken = "7366f1cc-611a-4ac0-a329-4ffb3d8a2b31";

checkSessionToken(sessionToken);
