// scripts/debug-ai-provider.js
const fs = require("fs");
const path = require("path");

// Dynamic path detection to handle both dev and production environments
const basePath = fs.existsSync("/var/www/portavi")
  ? "/var/www/portavi"
  : "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

const { PrismaClient } = require(prismaPath);

// Initialize Prisma client
const prisma = new PrismaClient();

async function debugAIProviderSettings() {
  console.log("=== AI Provider Settings Debug ===\n");

  try {
    // Get all organizations with AI provider settings
    const organizations = await prisma.organization.findMany({
      include: {
        aiProviderSettings: true,
        adoConnection: {
          include: {
            projects: true,
          },
        },
      },
    });

    console.log(`Found ${organizations.length} organizations:\n`);

    for (const org of organizations) {
      console.log(`Organization: ${org.name} (ID: ${org.id})`);
      console.log(`  AI Provider Settings: ${org.aiProviderSettings.length}`);

      for (const setting of org.aiProviderSettings) {
        console.log(`    - Provider: ${setting.provider}`);
        console.log(`    - Model: ${setting.model || "default"}`);
        console.log(
          `    - API Key: ${setting.apiKey ? "***masked***" : "NOT SET"}`
        );
        console.log(`    - Max Tokens: ${setting.maxTokens || "default"}`);
        console.log(`    - Temperature: ${setting.temperature || "default"}`);
        console.log("");
      }

      console.log(`  ADO Connections: ${org.adoConnections.length}`);
      for (const ado of org.adoConnections) {
        console.log(`    - Projects: ${ado.projects.length}`);
        for (const project of ado.projects) {
          console.log(`      - ${project.name} (ID: ${project.id})`);
        }
      }
      console.log("");
    }

    // Get recent AI jobs
    console.log("=== Recent AI Jobs ===\n");
    const recentJobs = await prisma.aIAgentJob.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          include: {
            adoConnection: {
              include: {
                organization: {
                  include: {
                    aiProviderSettings: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const job of recentJobs) {
      console.log(`Job ID: ${job.id}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Project: ${job.project?.name || "Unknown"}`);
      console.log(`  Repository: ${job.repositoryName}`);
      console.log(`  Error: ${job.errorMessage || "None"}`);

      const aiSettings =
        job.project?.adoConnection?.organization?.aiProviderSettings;
      console.log(
        `  AI Provider Settings Available: ${aiSettings?.length || 0}`
      );

      if (aiSettings?.length > 0) {
        console.log(`  First Provider: ${aiSettings[0].provider}`);
        console.log(`  API Key Set: ${aiSettings[0].apiKey ? "Yes" : "No"}`);
      }
      console.log("");
    }
  } catch (error) {
    console.error("Debug error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugAIProviderSettings().catch(console.error);
