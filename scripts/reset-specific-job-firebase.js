// scripts/reset-specific-job-firebase.js
// Resets a specific AI agent job to PENDING status for reprocessing (Firebase version)

const { adminDb } = require("./firebase-admin-init.js");

const aiAgentJobsCol = adminDb.collection("aiAgentJobs");

// Get job ID from command line arguments
const jobId = process.argv[2];

if (!jobId) {
  console.error("Error: No job ID provided");
  console.log("Usage: node reset-specific-job-firebase.js <jobId>");
  process.exit(1);
}

async function resetSpecificJob(id) {
  try {
    const snap = await aiAgentJobsCol.doc(id).get();

    if (!snap.exists) {
      console.error(`Error: Job with ID ${id} not found`);
      return;
    }

    const job = { id: snap.id, ...snap.data() };
    console.log(`Found job ${job.id} with status: ${job.status}`);

    await aiAgentJobsCol.doc(id).update({
      status: "PENDING",
      errorMessage: null,
      updatedAt: new Date(),
    });

    console.log(`Successfully reset job ${job.id} to PENDING status.`);
    console.log(
      "The AI Job Processor will pick it up in the next polling cycle."
    );
  } catch (error) {
    console.error("Error resetting job:", error);
  }
}

resetSpecificJob(jobId)
  .then(() => {
    console.log("Job reset process completed.");
  })
  .catch((error) => {
    console.error("Error in reset process:", error);
    process.exit(1);
  });
