// Prisma Direct Connection Debug Script
const { PrismaClient } = require("@prisma/client");

// Direct connection string without environment variables
const directConnectionString =
  "postgresql://portavi:phosiy5prixLpretruY0@localhost:5432/portavi";

// Create a Prisma client with direct connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directConnectionString,
    },
  },
  log: [
    { level: "query", emit: "event" },
    { level: "info", emit: "stdout" },
    { level: "warn", emit: "stdout" },
    { level: "error", emit: "stdout" },
  ],
});

// Add event listeners for query events
prisma.$on("query", (e) => {
  console.log("Query:", e.query);
  console.log("Params:", e.params);
  console.log("Duration:", e.duration + "ms");
  console.log("-".repeat(50));
});

async function main() {
  console.log("Starting Prisma direct connection test...");
  console.log("Using direct connection string (password masked)");

  try {
    // Test the connection with a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Connection successful! Found ${userCount} users`);

    // Try another query with relations
    const projects = await prisma.project.findMany({
      take: 5,
      include: {
        programTypes: {
          include: {
            programType: true,
          },
        },
      },
    });

    console.log(`Found ${projects.length} projects`);
  } catch (error) {
    console.error("❌ Error during test:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
