// PostgreSQL Prisma debug test script
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Log the database URL being used (with password masked)
const dbUrl = process.env.DATABASE_URL || "";
const maskedDbUrl = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
console.log("Using Database URL:", maskedDbUrl);

// Create a client with detailed logging
const prisma = new PrismaClient({
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
  console.log("Starting Prisma PostgreSQL debug test...");

  try {
    // Perform a simple query
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);

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
    console.error("Error during test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
