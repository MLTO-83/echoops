// scripts/validate-ai-provider-models.js
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

async function validateAIProviderModels() {
  console.log("=== AI Provider Model Validation ===\n");

  try {
    // Valid models for each provider
    const validModels = {
      openai: [
        "gpt-4",
        "gpt-4-turbo",
        "gpt-4-turbo-preview",
        "gpt-3.5-turbo",
        "gpt-4o",
        "gpt-4o-mini",
        "o1",
        "o1-preview",
        "o1-mini",
      ],
      google: [
        // Gemini 2.5 models
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-8b",
        // Gemini 2.0 models
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash-thinking-exp-1219",
        "gemini-2.0-flash-thinking-exp",
        // Gemini 1.5 models
        "gemini-1.5-pro",
        "gemini-1.5-pro-002",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-exp-0801",
        "gemini-1.5-pro-exp-0827",
        "gemini-1.5-flash",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-exp-0827",
        "gemini-1.5-flash-8b",
        "gemini-1.5-flash-8b-001",
        "gemini-1.5-flash-8b-exp-0827",
        // Gemini 1.0 models
        "gemini-1.0-pro",
        "gemini-1.0-pro-001",
        "gemini-1.0-pro-vision-latest",
        // Legacy naming
        "gemini-pro",
        "gemini-pro-vision",
      ],
      anthropic: [
        "claude-3-opus-20240229",
        "claude-3-sonnet-20240229",
        "claude-3-haiku-20240307",
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
      ],
    };

    // Get all AI provider settings
    const allSettings = await prisma.aIProviderSettings.findMany({
      include: {
        organization: true,
      },
    });

    console.log(`Found ${allSettings.length} AI provider settings:\n`);

    let hasInvalidModels = false;

    for (const setting of allSettings) {
      console.log(`Organization: ${setting.organization?.name || "Unknown"}`);
      console.log(`  Provider: ${setting.provider}`);
      console.log(`  Model: ${setting.model}`);
      console.log(`  API Key: ${setting.apiKey ? "Set" : "Not Set"}`);

      // Check if model is valid for the provider
      const provider = setting.provider.toLowerCase();
      let isValid = false;
      let validModelsForProvider = [];

      if (provider.includes("openai")) {
        validModelsForProvider = validModels.openai;
        isValid = validModels.openai.includes(setting.model);
      } else if (provider.includes("google") || provider.includes("gemini")) {
        validModelsForProvider = validModels.google;
        isValid = validModels.google.includes(setting.model);
      } else if (
        provider.includes("anthropic") ||
        provider.includes("claude")
      ) {
        validModelsForProvider = validModels.anthropic;
        isValid = validModels.anthropic.includes(setting.model);
      }

      if (isValid) {
        console.log(`  ✅ Model is valid`);
      } else {
        console.log(`  ❌ INVALID MODEL!`);
        console.log(`  Valid models for ${setting.provider}:`);
        validModelsForProvider.forEach((model) =>
          console.log(`    - ${model}`)
        );
        hasInvalidModels = true;

        if (provider.includes("google") || provider.includes("gemini")) {
          console.log(
            `  📖 Documentation: https://ai.google.dev/gemini-api/docs/models`
          );
        }
      }
      console.log("");
    }

    if (hasInvalidModels) {
      console.log("⚠️  Some AI provider settings have invalid models.");
      console.log(
        "   Please update them in the settings page before testing or running AI jobs."
      );
    } else {
      console.log("✅ All AI provider models are valid!");
    }
  } catch (error) {
    console.error("Error validating AI provider models:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the validation
validateAIProviderModels().catch(console.error);
