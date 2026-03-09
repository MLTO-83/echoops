import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, projectMembers, users } from "@/lib/firebase/db";
import { syncAzureProject } from "@/lib/actions/adoSync";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the project ID from query parameters
    const { searchParams } = new URL(req.url);
    const adoProjectId = searchParams.get("adoProjectId");
    const projectId = searchParams.get("projectId");

    if (!adoProjectId && !projectId) {
      return NextResponse.json(
        { error: "Missing adoProjectId or projectId parameter" },
        { status: 400 }
      );
    }

    // If we have an ADO project ID, sync it and return the local project ID
    if (adoProjectId) {
      console.log(`Debug sync called with ADO project ID: ${adoProjectId}`);
      const localProjectId = await syncAzureProject(adoProjectId);

      if (!localProjectId) {
        return NextResponse.json(
          { error: "Failed to sync project" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Project synced successfully",
        localProjectId,
      });
    }

    // If we have a local project ID, fetch project details and team members
    if (projectId) {
      console.log(`Debug sync called with local project ID: ${projectId}`);
      // Get the project with its ADO project ID
      const project = await projects.findById(projectId);

      if (!project?.adoProjectId) {
        return NextResponse.json(
          { error: "Project not found or not linked to ADO" },
          { status: 404 }
        );
      }

      // Sync the team members
      await syncAzureProject(project.adoProjectId);

      // Fetch project members to return in response
      const members = await projectMembers.findByProject(projectId);

      // Enrich members with user data
      const enrichedMembers = await Promise.all(
        members.map(async (m) => {
          const memberUser = await users.findById(m.userId);
          return {
            id: m.id,
            role: m.role,
            userName: memberUser?.name,
            userEmail: memberUser?.email,
          };
        })
      );

      return NextResponse.json({
        success: true,
        message: "Project members synced successfully",
        memberCount: members.length,
        members: enrichedMembers,
      });
    }
  } catch (error) {
    console.error("Error in debug sync endpoint:", error);
    return NextResponse.json(
      {
        error: `Sync failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
