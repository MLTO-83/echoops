// Test the AI Settings API endpoint directly
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function testAPILogic() {
  try {
    console.log("=== Testing AI Settings API Logic ===");

    // Simulate what the API does
    const user = await prisma.user.findFirst({
      where: {
        email: "torslev@hotmail.com", // Using your email
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    });

    console.log("Found user:", user);

    if (!user || !user.organizationId) {
      console.log("❌ User has no organization");
      return;
    }

    // Get AI settings for the organization
    const aiSettings = await prisma.aIProviderSettings.findFirst({
      where: { organizationId: user.organizationId },
    });

    console.log("AI Settings found:", aiSettings);

    if (!aiSettings) {
      console.log("❌ No AI settings found");
      return;
    }

    console.log("✅ Provider:", aiSettings.provider);
    console.log(
      '✅ Provider includes "google"?',
      aiSettings.provider.toLowerCase().includes("google")
    );
    console.log(
      '✅ Provider includes "gemini"?',
      aiSettings.provider.toLowerCase().includes("gemini")
    );

    // Test the model validation
    const modelName = aiSettings.model || "gemini-1.5-pro";
    console.log("✅ Model to test:", modelName);

    // Check if model is in our validation list
    const validModels = [
      // Gemini 2.5 models
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.5-flash-preview-native-audio-dialog",
      "gemini-2.5-flash-exp-native-audio-thinking-dialog",
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro-preview-05-06",
      "gemini-2.5-pro-preview-tts",
      // Gemini 2.0 models
      "gemini-2.0-flash",
      "gemini-2.0-flash-001", // Stable version
      "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash-live-001",
      // Gemini 1.5 models
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      // Legacy models
      "gemini-1.0-pro",
      "gemini-pro",
      // Embedding models
      "gemini-embedding-exp",
      // Image/Video generation models
      "imagen-3.0-generate-002",
      "veo-2.0-generate-001",
    ];

    console.log("✅ Model is valid?", validModels.includes(modelName));

    if (!validModels.includes(modelName)) {
      console.log("❌ Model validation would fail");
      console.log("Valid models are:", validModels.join(", "));
    } else {
      console.log("✅ Model validation would pass");
    }

    // Test API key presence
    console.log("✅ Has API key?", !!aiSettings.apiKey);
    console.log("✅ API key length:", aiSettings.apiKey?.length || 0);
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAPILogic();
