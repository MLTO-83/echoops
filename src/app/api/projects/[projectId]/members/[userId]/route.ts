import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projectMembers } from "@/lib/firebase/db";

// DELETE /api/projects/:projectId/members/:userId - Remove a project member
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract parameters from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];
    const userId = pathParts[pathParts.indexOf("members") + 1];

    // Check if the member exists
    const member = await projectMembers.findByUserAndProject(userId, projectId);

    if (!member) {
      return NextResponse.json(
        { error: "Project member not found" },
        { status: 404 }
      );
    }

    // Delete the member
    await projectMembers.delete(projectId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json(
      { error: "Failed to remove project member" },
      { status: 500 }
    );
  }
}
