// scripts/check-webhook-projects.js
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

async function checkWebhookProjects() {
  console.log("=== Projects with ADO Connections and Webhook Config ===\n");

  try {
    // Get all projects with ADO connections and their webhook configs
    const projects = await prisma.project.findMany({
      where: {
        adoConnection: {
          isNot: null,
        },
      },
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
        webhookConfig: true, // Include webhook configuration
      },
    });

    console.log(`Found ${projects.length} projects with ADO connections:\n`);

    let projectsWithWebhooks = 0;
    let validProjectForTesting = null;

    for (const project of projects) {
      console.log(`Project: ${project.name} (${project.id})`);
      console.log(
        `  Organization: ${project.adoConnection?.organization?.name || "Unknown"}`
      );

      if (project.webhookConfig) {
        console.log(
          `  Repository: ${project.webhookConfig.repositoryName || "Not set"}`
        );
        console.log(
          `  Webhook Enabled: ${project.webhookConfig.active ? "Yes" : "No"}`
        );
        console.log(
          `  Azure Project ID: ${project.webhookConfig.azureProjectId || "Not set"}`
        );
        console.log(
          `  Webhook URL: ${project.webhookConfig.webhookUrl || "Not set"}`
        );

        if (
          project.webhookConfig.active &&
          project.webhookConfig.repositoryName &&
          project.adoConnection?.organization?.aiProviderSettings?.length > 0
        ) {
          console.log(`  ✅ VALID FOR AI TESTING`);
          if (!validProjectForTesting) {
            validProjectForTesting = project;
          }
          projectsWithWebhooks++;
        } else {
          console.log(`  ⚠️  Missing webhook setup or AI settings`);
        }
      } else {
        console.log(`  Repository: No webhook config found`);
        console.log(`  Webhook Enabled: No webhook config found`);
        console.log(`  ❌ NO WEBHOOK CONFIGURATION`);
      }

      const aiSettings =
        project.adoConnection?.organization?.aiProviderSettings || [];
      console.log(`  AI Provider Settings: ${aiSettings.length} configured`);

      console.log("");
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total projects with ADO connections: ${projects.length}`);
    console.log(`Projects with webhooks enabled: ${projectsWithWebhooks}`);

    if (validProjectForTesting) {
      console.log(`\n✅ Recommended project for AI testing:`);
      console.log(`   Name: ${validProjectForTesting.name}`);
      console.log(`   ID: ${validProjectForTesting.id}`);
      console.log(
        `   Repository: ${validProjectForTesting.webhookConfig.repositoryName}`
      );
    } else {
      console.log(`\n❌ No projects found with complete webhook + AI setup`);
      console.log(
        `   Please configure webhook settings for at least one project`
      );
    }
  } catch (error) {
    console.error("Error checking webhook projects:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkWebhookProjects().catch(console.error);
