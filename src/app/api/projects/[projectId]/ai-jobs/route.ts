import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure the route is always dynamic and not cached

// GET /api/projects/{projectId}/ai-jobs - get AI agent jobs for a project
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Remove strict membership check - just ensure user is authenticated
    // This allows any authenticated user to view AI jobs for a project

    // Fetch the project's AI agent jobs - include ALL jobs for this project
    const jobs = await prisma.aIAgentJob.findMany({
      where: {
        projectId: projectId,
        // No filtering by status to ensure we get all jobs including CONFIGURED ones
      },
      orderBy: [
        { updatedAt: "desc" }, // Most recently updated first
      ],
      take: 50, // Limit to the most recent 50 jobs
    });

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
