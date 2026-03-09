// scripts/test-empty-repo-initialization.js
// This script tests the automatic initialization of empty repositories

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

async function createTestJob(emptyRepoName = "EmptyTestRepository") {
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
      return false;
    }

    console.log(
      `Creating test job for project: ${project.id} (${project.name})`
    );
    console.log(`Using empty repository name: ${emptyRepoName}`);

    // Create a test job
    const job = await prisma.aIAgentJob.create({
      data: {
        projectId: project.id,
        prompt:
          "This is a test job for an empty repository. Create a simple 'Hello World' function in JavaScript.",
        repositoryName: emptyRepoName,
        status: "PENDING",
        adoWorkItemId: "TEST-789",
        adoWorkItemTitle: "Test Empty Repository Initialization",
        adoWorkItemType: "Task",
      },
    });

    console.log(`Test job created with ID: ${job.id}`);
    console.log("Waiting 20 seconds to check if job is processed...");

    // Wait for 20 seconds
    await new Promise((resolve) => setTimeout(resolve, 20000));

    // Check job status
    const updatedJob = await prisma.aIAgentJob.findUnique({
      where: { id: job.id },
    });

    console.log(`Job ${job.id} status after wait: ${updatedJob.status}`);

    if (updatedJob.status === "COMPLETED") {
      console.log(
        "Job was completed successfully! The automatic empty repository initialization is working."
      );
      console.log("Job details:", updatedJob);
      console.log("PR URL:", updatedJob.pullRequestUrl);
      return true;
    } else if (updatedJob.status === "FAILED") {
      console.error("Job failed. Error:", updatedJob.errorMessage);
      return false;
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

// Check for command line arguments
const repoName = process.argv[2] || "EmptyTestRepository";

// Run the test
createTestJob(repoName)
  .then((success) => {
    if (!success) {
      console.log("Please check the AI Job Processor logs for more details:");
      console.log("tail -f /root/portavi/scripts/process-ai-jobs.log");
    }
    prisma.$disconnect();
    process.exit(success ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
