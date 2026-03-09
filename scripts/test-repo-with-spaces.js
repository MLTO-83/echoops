// scripts/test-repo-with-spaces.js
// This script adds a test job to the database with a repository name containing spaces

// Dynamic path detection to handle both dev and production environments
const fs = require("fs");
const path = require("path");

// Check if we're in production or development environment
const basePath = fs.existsSync("/var/www/portavi")
  ? "/var/www/portavi"
  : "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

const { PrismaClient } = require(prismaPath);
const prisma = new PrismaClient();

async function createTestJob(customRepoName = null) {
  try {
    // Get a valid project ID
    const project = await prisma.project.findFirst({
      include: {
        webhookConfig: true,
      },
      where: {
        webhookConfig: {
          active: true,
        },
      },
    });

    if (!project) {
      console.error("No project with active webhook config found");
      return;
    }

    console.log(
      `Creating test job for project: ${project.id} (${project.name})`
    );

    // Use the custom repository name if provided, otherwise use the default test name
    const repositoryName = customRepoName || "MasterData management";

    console.log(`Using repository name: "${repositoryName}"`);

    // Create a test job with a repository name containing spaces
    const job = await prisma.aIAgentJob.create({
      data: {
        projectId: project.id,
        prompt:
          "This is a test job. Create a simple 'Hello World' function in JavaScript.",
        repositoryName: repositoryName,
        status: "PENDING",
        adoWorkItemId: "TEST-456",
        adoWorkItemTitle: "Test Repo With Spaces",
        adoWorkItemType: "Task",
      },
    });

    console.log(`Test job created with ID: ${job.id}`);
    console.log("Waiting 15 seconds to check if job is processed...");

    // Wait for 15 seconds
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Check job status
    const updatedJob = await prisma.aIAgentJob.findUnique({
      where: { id: job.id },
    });

    console.log(`Job ${job.id} status after wait: ${updatedJob.status}`);

    if (updatedJob.status !== "PENDING") {
      console.log(
        "Job was processed! The AI Job Processor is working correctly with special repository names."
      );
      console.log("Job details:", updatedJob);
      console.log("PR URL:", updatedJob.pullRequestUrl);
      return true;
    } else {
      console.log(
        "Job is still pending. The AI Job Processor might not be running."
      );
      return false;
    }
  } catch (error) {
    console.error("Error creating or checking test job:", error);
    return false;
  }
}

// Export the function to be able to call it with custom repository names
exports.testWithCustomRepo = createTestJob;

// Run the default test if the script is called directly
if (require.main === module) {
  // Check if a repository name was provided as a command-line argument
  const customRepoName = process.argv[2];
  if (customRepoName) {
    console.log(
      `Using custom repository name from command line: "${customRepoName}"`
    );
  }

  createTestJob(customRepoName)
    .then((success) => {
      if (!success) {
        console.log("Please check that the AI Job Processor is running:");
        console.log("systemctl status ai-job-processor.service");
      }
      prisma.$disconnect();
      process.exit(success ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      prisma.$disconnect();
      process.exit(1);
    });
}
