// Seed script to populate the initial state values
const { PrismaClient } = require("../../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

const states = [
  {
    id: "new",
    name: "New",
    description: "The project is created but not yet approved.",
  },
  {
    id: "approved",
    name: "Approved",
    description: "The project is approved and ready to start.",
  },
  {
    id: "in_progress",
    name: "In Progress",
    description: "The project is active and ongoing.",
  },
  {
    id: "in_production",
    name: "In Production",
    description:
      "The project has been completed and the result is now live (e.g., a system in use).",
  },
  {
    id: "closed",
    name: "Closed",
    description: "The project is officially closed and archived.",
  },
  {
    id: "on_hold",
    name: "On Hold",
    description: "The project is temporarily paused.",
  },
  {
    id: "cancelled",
    name: "Cancelled",
    description: "The project has been stopped before completion.",
  },
];

async function seedStates() {
  console.log("Seeding state values...");

  try {
    for (const state of states) {
      await prisma.state.upsert({
        where: { id: state.id },
        update: state,
        create: state,
      });
      console.log(`Created/updated state: ${state.name}`);
    }

    console.log("State seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding states:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedStates();
