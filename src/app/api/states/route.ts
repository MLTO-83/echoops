import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/states - Retrieve all available project states
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch all states from the database
    const states = await prisma.state.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ states });
  } catch (error) {
    console.error("Error retrieving states:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project states" },
      { status: 500 }
    );
  }
}
