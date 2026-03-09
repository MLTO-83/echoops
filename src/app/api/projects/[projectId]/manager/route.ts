import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, users, projectMembers, projectMemberWeeklyHours } from "@/lib/firebase/db";
import { getCurrentWeekAndYear } from "@/lib/date-utils";

// POST /api/projects/:projectId/manager - Set a project manager (OWNER role)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if the project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the user exists
    const user = await users.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Find current project manager (if any)
    const members = await projectMembers.findByProject(projectId);
    const currentManager = members.find((m: any) => m.role === "OWNER");

    // 2. If there is a current manager, demote to regular member
    if (currentManager) {
      if (currentManager.userId === userId) {
        // The requested user is already the manager
        return NextResponse.json({ manager: currentManager });
      }

      await projectMembers.update(projectId, currentManager.userId, {
        role: "MEMBER",
      });
    }

    // 3. Check if the new manager is already a member
    const existingMember = await projectMembers.findByUserAndProject(userId, projectId);

    // 4. Either update existing member to OWNER or create new member as OWNER
    let result;
    if (existingMember) {
      // Update the role to OWNER
      await projectMembers.update(projectId, userId, { role: "OWNER" });
      result = await projectMembers.findByUserAndProject(userId, projectId);
    } else {
      // Get current week and year
      const { weekNumber, year } = getCurrentWeekAndYear();

      // Create a new member with OWNER role
      await projectMembers.create({
        userId,
        projectId,
        role: "OWNER",
      });

      // Set weekly hours to 0 for the new member
      await projectMemberWeeklyHours.upsert(projectId, userId, { year, weekNumber, hours: 0 });

      result = await projectMembers.findByUserAndProject(userId, projectId);
    }

    return NextResponse.json({ manager: result });
  } catch (error) {
    console.error("Error setting project manager:", error);
    return NextResponse.json(
      { error: "Failed to set project manager" },
      { status: 500 }
    );
  }
}
