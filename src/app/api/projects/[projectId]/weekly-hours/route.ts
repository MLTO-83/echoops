import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projectMembers } from "@/lib/firebase/db";
import {
  getProjectWeeklyHours,
  setWeeklyHours,
  setBulkWeeklyHours,
} from "@/lib/actions/weeklyHours";

// Get weekly hours for all members in a project
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const url = new URL(req.url);
    const year = url.searchParams.get("year");

    const weeklyHours = await getProjectWeeklyHours(
      projectId,
      year ? parseInt(year) : undefined
    );

    return NextResponse.json(weeklyHours);
  } catch (error) {
    console.error("Error fetching weekly hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly hours" },
      { status: 500 }
    );
  }
}

// Set hours for a specific week for a project member
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const body = await req.json();
    const { projectMemberId, year, weekNumber, hours } = body;

    if (
      !projectMemberId ||
      year === undefined ||
      weekNumber === undefined ||
      hours === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the project member belongs to this project
    const member = await projectMembers.findByMemberId(projectMemberId);

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: "Project member not found in this project" },
        { status: 404 }
      );
    }

    const result = await setWeeklyHours(
      projectMemberId,
      year,
      weekNumber,
      hours
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error setting weekly hours:", error);
    return NextResponse.json(
      {
        error: "Failed to set weekly hours",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Set hours for multiple weeks at once
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const body = await req.json();
    const { projectMemberId, year, weekRange, hours } = body;

    if (
      !projectMemberId ||
      year === undefined ||
      !weekRange ||
      hours === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the project member belongs to this project
    const member = await projectMembers.findByMemberId(projectMemberId);

    if (!member || member.projectId !== projectId) {
      return NextResponse.json(
        { error: "Project member not found in this project" },
        { status: 404 }
      );
    }

    const result = await setBulkWeeklyHours(
      projectMemberId,
      year,
      weekRange,
      hours
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error setting bulk weekly hours:", error);
    return NextResponse.json(
      {
        error: "Failed to set bulk weekly hours",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
