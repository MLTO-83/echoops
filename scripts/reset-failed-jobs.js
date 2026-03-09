// scripts/reset-failed-jobs.js
// This script resets failed AI agent jobs to PENDING status for reprocessing

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

async function resetFailedJobs() {
  try {
    // Find all failed jobs
    const failedJobs = await prisma.aIAgentJob.findMany({
      where: {
        status: "FAILED",
      },
      include: {
        project: true,
      },
    });

    console.log(`Found ${failedJobs.length} failed jobs`);

    if (failedJobs.length === 0) {
      console.log("No failed jobs to reset.");
      return;
    }

    // Reset each job to PENDING status
    for (const job of failedJobs) {
      console.log(
        `Resetting job ${job.id} for work item ${job.adoWorkItemId || "unknown"} to PENDING status`
      );

      await prisma.aIAgentJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          errorMessage: null,
        },
      });
    }

    console.log(
      `Successfully reset ${failedJobs.length} jobs to PENDING status.`
    );
    console.log(
      "The AI Job Processor will pick them up in the next polling cycle."
    );
  } catch (error) {
    console.error("Error resetting failed jobs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
resetFailedJobs()
  .then(() => {
    console.log("Job reset process completed.");
  })
  .catch((error) => {
    console.error("Error in reset process:", error);
    process.exit(1);
  });
