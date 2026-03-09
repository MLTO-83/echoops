import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { states } from "@/lib/firebase/db";

// State definitions from project_state.md
const stateDefinitions = [
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

/**
 * GET /api/seed/states - Get all states from the database or return default states if none exist
 */
export async function GET(req: NextRequest) {
  try {
    // Allow public access to this endpoint for read-only operations
    const existingStates = await states.findMany();

    // If no states exist in the database, return the default states
    if (existingStates.length === 0) {
      return NextResponse.json({
        states: stateDefinitions,
        message:
          "No states found in database. Returning default states that would be used for seeding.",
      });
    }

    // Return the states from the database
    return NextResponse.json({
      states: existingStates,
      count: existingStates.length,
    });
  } catch (error) {
    console.error("Error retrieving states:", error);
    return NextResponse.json(
      {
        error: `Failed to retrieve states: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seed/states - Seed the States table with initial values
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Seeding state values...");
    let created = 0;
    let updated = 0;

    // Upsert each state
    for (const state of stateDefinitions) {
      const existing = await states.findById(state.id);

      if (existing) {
        await states.upsert(state.id, { name: state.name, description: state.description });
        updated++;
      } else {
        await states.upsert(state.id, { name: state.name, description: state.description });
        created++;
      }
    }

    console.log(
      `States seeded successfully: ${created} created, ${updated} updated`
    );
    return NextResponse.json({
      success: true,
      message: `States seeded successfully: ${created} created, ${updated} updated`,
      created,
      updated,
    });
  } catch (error) {
    console.error("Error seeding states:", error);
    return NextResponse.json(
      {
        error: `Failed to seed states: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}
