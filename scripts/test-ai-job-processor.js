// scripts/test-ai-job-processor.js
// This script adds a test job to the database and checks if it gets processed

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

async function createTestJob() {
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

    // Create a test job
    const job = await prisma.aIAgentJob.create({
      data: {
        projectId: project.id,
        prompt:
          "This is a test job. Create a simple 'Hello World' function in JavaScript.",
        repositoryName: "TestRepository",
        status: "PENDING",
        adoWorkItemId: "TEST-123",
        adoWorkItemTitle: "Test AI Job Processor",
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
        "Job was processed! The AI Job Processor is working correctly."
      );
      console.log("Job details:", updatedJob);
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

createTestJob()
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
