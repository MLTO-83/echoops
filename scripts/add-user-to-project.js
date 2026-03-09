// Script to check if a project exists and add a user to it
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function addUserToProject(projectId, userEmail) {
  try {
    console.log(`Checking if project ${projectId} exists...`);

    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      console.log(`Project with ID ${projectId} does not exist.`);

      // List available projects
      console.log("\nAvailable projects:");
      const projects = await prisma.project.findMany({
        select: { id: true, name: true },
      });

      projects.forEach((p) => console.log(`- ${p.name} (${p.id})`));

      return;
    }

    console.log(`Found project: ${project.name} (${project.id})`);

    // Check if the user exists
    console.log(`Looking for user with email: ${userEmail}`);
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.log(
        `User with email ${userEmail} does not exist. Creating user...`
      );
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userEmail.split("@")[0],
        },
      });
      console.log(`User created: ${user.name} (${user.id})`);
    } else {
      console.log(`Found user: ${user.name} (${user.id})`);
    }

    // Check if user is already a project member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
      },
    });

    if (existingMember) {
      console.log(
        `User is already a member of this project with role: ${existingMember.role}`
      );
      return;
    }

    // Add user to the project with OWNER role
    const newMember = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
        role: "OWNER",
        hoursPerWeek: 40,
        hoursPerMonth: 160,
      },
    });

    console.log(
      `User successfully added to project with role: ${newMember.role}`
    );
    console.log(`Now you should be able to access the project members API.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Use the actual email associated with the session token
const projectId = "cm9s8ufq00000qbcw3fq4egle";
const userEmail = "horsensmlt@gmail.com"; // The email from the session check

addUserToProject(projectId, userEmail);
