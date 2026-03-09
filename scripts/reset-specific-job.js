// scripts/reset-specific-job.js
// This script resets a specific AI agent job to PENDING status for reprocessing

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

// Get job ID from command line arguments
const jobId = process.argv[2];

if (!jobId) {
  console.error("Error: No job ID provided");
  console.log("Usage: node reset-specific-job.js <jobId>");
  process.exit(1);
}

async function resetSpecificJob(id) {
  try {
    // Find the job
    const job = await prisma.aIAgentJob.findUnique({
      where: {
        id: id,
      },
    });

    if (!job) {
      console.error(`Error: Job with ID ${id} not found`);
      return;
    }

    console.log(`Found job ${job.id} with status: ${job.status}`);

    // Reset the job to PENDING status
    await prisma.aIAgentJob.update({
      where: { id: job.id },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });

    console.log(`Successfully reset job ${job.id} to PENDING status.`);
    console.log(
      "The AI Job Processor will pick it up in the next polling cycle."
    );
  } catch (error) {
    console.error("Error resetting job:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
resetSpecificJob(jobId)
  .then(() => {
    console.log("Job reset process completed.");
  })
  .catch((error) => {
    console.error("Error in reset process:", error);
    process.exit(1);
  });
