// scripts/reset-failed-jobs-firebase.js
// Resets failed AI agent jobs to PENDING status for reprocessing (Firebase version)

const { adminDb } = require("./firebase-admin-init.js");

const aiAgentJobsCol = adminDb.collection("aiAgentJobs");

async function resetFailedJobs() {
  try {
    // Find all failed jobs
    const snap = await aiAgentJobsCol.where("status", "==", "FAILED").get();

    console.log(`Found ${snap.size} failed jobs`);

    if (snap.empty) {
      console.log("No failed jobs to reset.");
      return;
    }

    // Reset each job to PENDING status
    const batch = adminDb.batch();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      console.log(
        `Resetting job ${doc.id} for work item ${data.adoWorkItemId || "unknown"} to PENDING status`
      );
      batch.update(doc.ref, {
        status: "PENDING",
        errorMessage: null,
        updatedAt: new Date(),
      });
    });

    await batch.commit();

    console.log(
      `Successfully reset ${snap.size} jobs to PENDING status.`
    );
    console.log(
      "The AI Job Processor will pick them up in the next polling cycle."
    );
  } catch (error) {
    console.error("Error resetting failed jobs:", error);
  }
}

resetFailedJobs()
  .then(() => {
    console.log("Job reset process completed.");
  })
  .catch((error) => {
    console.error("Error in reset process:", error);
    process.exit(1);
  });
