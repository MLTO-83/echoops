import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, aiAgentJobs } from "@/lib/firebase/db";

export const dynamic = "force-dynamic"; // Ensure the route is always dynamic and not cached

// GET /api/projects/{projectId}/ai-jobs - get AI agent jobs for a project
export async function GET(req: NextRequest) {
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

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Remove strict membership check - just ensure user is authenticated
    // This allows any authenticated user to view AI jobs for a project

    // Fetch the project's AI agent jobs - ordered by createdAt desc from Firebase
    const allJobs = await aiAgentJobs.findByProject(projectId);

    // Sort by updatedAt desc and limit to 50
    const jobs = allJobs
      .sort((a, b) => {
        const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt as any).getTime();
        const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt as any).getTime();
        return bTime - aTime;
      })
      .slice(0, 50);

    return NextResponse.json({
      jobs: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching project AI jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI agent jobs" },
      { status: 500 }
    );
  }
}
