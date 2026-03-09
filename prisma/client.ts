/**
 * Centralized TypeScript Prisma client singleton
 * This file should be the only place that imports PrismaClient directly
 */
import { PrismaClient } from "./app/generated/prisma/client";
import path from "path";

// Load environment from .env.local explicitly for non-production environments
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });
}

// Add prisma to the global type for Node.js environments
// We'll use a unique name to avoid conflicts with other global declarations
declare global {
  var __prisma_client_singleton: PrismaClient | undefined;
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
  client.$on("query", (e: any) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
    console.log("-".repeat(50));
  });

  return client;
};

// Prevent multiple instances of Prisma Client in development
const prisma = globalThis.__prisma_client_singleton ?? prismaClientSingleton();

// Save the instance to the global object in non-production environments
if (process.env.NODE_ENV !== "production")
  globalThis.__prisma_client_singleton = prisma;

export default prisma;
