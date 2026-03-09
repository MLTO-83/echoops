// src/app/api/projects/[projectId]/ai-jobs/retry/route.ts
// API endpoint to retry failed AI agent jobs

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, aiAgentJobs } from "@/lib/firebase/db";

export const dynamic = "force-dynamic"; // Ensure the route is always dynamic and not cached

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Extract projectId from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // No need to check for project membership - any authenticated user can retry jobs
    // Just verify that the project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the job exists and belongs to the project
    const job = await aiAgentJobs.findById(jobId);

    if (!job || job.projectId !== projectId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset the job to PENDING status
    const updatedJob = await aiAgentJobs.update(jobId, {
      status: "PENDING",
      errorMessage: null,
    });

    return NextResponse.json({ job: updatedJob });
  } catch (error: any) {
    console.error("Error retrying job:", error);
    return NextResponse.json({ error: "Failed to retry job" }, { status: 500 });
  }
}
