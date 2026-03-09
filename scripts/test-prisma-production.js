// scripts/test-prisma-production.js
const { PrismaClient } = require("@prisma/client");

async function testPrismaProduction() {
  const prisma = new PrismaClient();

  try {
    console.log("=== Testing Prisma AIAgentJob model in production ===\n");

    // Test 1: Check if we can connect to database
    console.log("Test 1: Database connection...");
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Test 2: Test AIAgentJob model access
    console.log("\nTest 2: AIAgentJob model access...");
    const jobCount = await prisma.aIAgentJob.count();
    console.log(`✅ AIAgentJob model works! Found ${jobCount} total jobs`);

    // Test 3: Get pending jobs with relationships
    console.log("\nTest 3: Pending jobs with relationships...");
    const pendingJobs = await prisma.aIAgentJob.findMany({
      where: { status: "PENDING" },
      take: 3,
      include: {
        project: {
          include: {
            webhookConfig: true,
            adoConnection: true,
          },
        },
      },
    });

    console.log(`✅ Found ${pendingJobs.length} pending jobs`);

    if (pendingJobs.length > 0) {
      console.log("\nFirst pending job details:");
      const job = pendingJobs[0];
      console.log(`- Job ID: ${job.id}`);
      console.log(`- Status: ${job.status}`);
      console.log(`- Repository: ${job.repositoryName}`);
      console.log(`- Project ID: ${job.project?.id}`);
      console.log(`- Has webhook config: ${!!job.project?.webhookConfig}`);
      console.log(
        `- Webhook active: ${job.project?.webhookConfig?.active || false}`
      );
      console.log(`- Has ADO connection: ${!!job.project?.adoConnection}`);
      console.log(`- Created: ${job.createdAt}`);
    }

    // Test 4: Check ADO connections
    console.log("\nTest 4: ADO connections...");
    const adoConnections = await prisma.aDOConnection.findMany({
      include: {
        organization: true,
        projects: true,
      },
    });
    console.log(`✅ Found ${adoConnections.length} ADO connections`);

    if (adoConnections.length > 0) {
      const ado = adoConnections[0];
      console.log(`- Organization URL: ${ado.adoOrganizationUrl}`);
      console.log(`- Has PAT: ${!!ado.pat}`);
      console.log(`- Connected projects: ${ado.projects?.length || 0}`);
    }

    console.log("\n=== All tests passed! Prisma is working correctly ===");
    return true;
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaProduction().catch(console.error);
