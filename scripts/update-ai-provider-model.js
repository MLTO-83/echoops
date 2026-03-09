// scripts/update-ai-provider-model.js
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

async function updateAIProviderModel() {
  console.log("=== Updating AI Provider Model ===\n");

  try {
    // Get all AI provider settings with invalid models
    const allSettings = await prisma.aIProviderSettings.findMany({
      include: {
        organization: true,
      },
    });

    console.log(`Found ${allSettings.length} AI provider settings:\n`);

    for (const setting of allSettings) {
      console.log(`Organization: ${setting.organization?.name || "Unknown"}`);
      console.log(`  Provider: ${setting.provider}`);
      console.log(`  Current Model: ${setting.model}`);

      // Check if this is the invalid Google model
      if (
        setting.provider === "Google Gemini" &&
        (setting.model === "gemini-2.5-pro-preview-05-06" ||
          setting.model === "gemini-2.5-flash-preview-04-17" ||
          setting.model.includes("preview"))
      ) {
        const newModel = "gemini-1.5-pro";
        console.log(`  🔄 Updating to valid model: ${newModel}`);

        await prisma.aIProviderSettings.update({
          where: { id: setting.id },
          data: { model: newModel },
        });

        console.log(`  ✅ Successfully updated model`);
      } else {
        console.log(`  ℹ️  No update needed`);
      }
      console.log("");
    }

    console.log("✅ AI provider model update completed!");
  } catch (error) {
    console.error("Error updating AI provider model:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateAIProviderModel().catch(console.error);
