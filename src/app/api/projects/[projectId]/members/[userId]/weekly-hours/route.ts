import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projectMembers, projectMemberWeeklyHours } from "@/lib/firebase/db";
import {
  updateProjectMemberWeeklyHours,
  setUniformWeeklyHours,
} from "@/lib/actions/projectMember";

/**
 * GET handler to retrieve weekly hours for a project member
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract parameters from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];
    const userId = pathParts[pathParts.indexOf("members") + 1];

    // Find the project member
    const projectMember = await projectMembers.findByUserAndProject(
      userId,
      projectId
    );

    if (!projectMember) {
      return NextResponse.json(
        { error: "Project member not found" },
        { status: 404 }
      );
    }

    // Extract year parameter from query if it exists
    const url = new URL(request.url);
    const year = url.searchParams.get("year")
      ? parseInt(url.searchParams.get("year") as string)
      : new Date().getFullYear();

    // Fetch weekly hours filtered by year
    const weeklyHours = await projectMemberWeeklyHours.findByMember(
      projectId,
      userId,
      { year }
    );

    return NextResponse.json({ weeklyHours });
  } catch (error) {
    console.error("Error fetching weekly hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly hours" },
      { status: 500 }
    );
  }
}

/**
 * POST handler to update weekly hours for a project member
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract parameters from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];
    const userId = pathParts[pathParts.indexOf("members") + 1];

    const data = await request.json();

    // Find the project member
    const projectMember = await projectMembers.findByUserAndProject(
      userId,
      projectId
    );

    if (!projectMember) {
      return NextResponse.json(
        { error: "Project member not found" },
        { status: 404 }
      );
    }

    if (data.operation === "setUniform") {
      // Handle setting uniform hours for a range of weeks
      const { hours, startWeek, endWeek, year } = data;

      if (
        typeof hours !== "number" ||
        typeof startWeek !== "number" ||
        typeof endWeek !== "number" ||
        typeof year !== "number"
      ) {
        return NextResponse.json(
          { error: "Invalid parameters for uniform hours" },
          { status: 400 }
        );
      }

      const result = await setUniformWeeklyHours(
        `${projectMember.userId}_${projectMember.projectId}`,
        hours,
        startWeek,
        endWeek,
        year
      );

      return NextResponse.json(result);
    } else {
      // Handle individual week updates
      const { weeklyHours } = data;

      if (!Array.isArray(weeklyHours)) {
        return NextResponse.json(
          { error: "Weekly hours must be an array" },
          { status: 400 }
        );
      }

      const result = await updateProjectMemberWeeklyHours(
        `${projectMember.userId}_${projectMember.projectId}`,
        weeklyHours
      );

      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("Error updating weekly hours:", error);

    if (error.name === "ProjectMemberValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update weekly hours" },
      { status: 500 }
    );
  }
}
