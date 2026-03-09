/**
 * Centralized Prisma client singleton
 * This file should be the only place that imports PrismaClient directly
 */
const { PrismaClient } = require("./app/generated/prisma/client");
const path = require("path");

// Load environment from .env.local explicitly for non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
}

// Create Prisma client with logging configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "info", emit: "stdout" },
      { level: "warn", emit: "stdout" },
      { level: "error", emit: "stdout" },
    ],
    // Explicitly use the DATABASE_URL from the environment
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Create a single instance of the Prisma client
const prismaClientSingleton = () => {
  const client = createPrismaClient();

  // Add event listeners for detailed query logging
  client.$on("query", (e) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
    console.log("-".repeat(50));
  });

  return client;
};

// Ensure we use a single instance throughout the application
let prisma;

// For Node.js, use global scope for singleton with a unique name
// to avoid conflicts with other global declarations
if (typeof global !== "undefined") {
  if (!global.__prisma_client_singleton) {
    global.__prisma_client_singleton = prismaClientSingleton();
  }
  prisma = global.__prisma_client_singleton;
}
// For browser/edge environments, create a new instance
else {
  prisma = prismaClientSingleton();
}

module.exports = prisma;
