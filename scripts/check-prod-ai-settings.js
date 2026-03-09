// Check AI Provider Settings on Production
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function checkSettings() {
  try {
    console.log("=== Checking AI Provider Settings ===");

    // Check organizations
    const orgs = await prisma.organization.findMany({
      include: {
        aiProviderSettings: true,
        users: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    console.log("Organizations found:", orgs.length);
    orgs.forEach((org) => {
      console.log("\nOrg:", org.name, "ID:", org.id);
      console.log("  Users:", org.users.length);
      console.log("  AI Settings:", org.aiProviderSettings.length);

      if (org.aiProviderSettings.length === 0) {
        console.log("  ❌ No AI provider settings configured");
      } else {
        org.aiProviderSettings.forEach((setting) => {
          console.log("    ✅ Provider:", setting.provider);
          console.log("    ✅ Model:", setting.model);
          console.log("    ✅ Has API Key:", !!setting.apiKey);
          console.log("    ✅ Temperature:", setting.temperature);
          console.log("    ✅ Max Tokens:", setting.maxTokens);
        });
      }
    });

    // Also check if there are any test users
    const users = await prisma.user.findMany({
      where: {
        organizationId: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationId: true,
      },
    });

    console.log("\n=== Users with Organizations ===");
    console.log("Users found:", users.length);
    users.forEach((user) => {
      console.log("User:", user.email, "Org ID:", user.organizationId);
    });
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkSettings();
