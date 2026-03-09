import { NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { states } from "@/lib/firebase/db";

/**
 * GET /api/states - Retrieve all available project states
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch all states from the database
    const allStates = await states.findMany();

    return NextResponse.json({ states: allStates });
  } catch (error) {
    console.error("Error retrieving states:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project states" },
      { status: 500 }
    );
  }
}
