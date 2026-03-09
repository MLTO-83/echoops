// src/app/api/projects/[projectId]/ai-jobs/retry/route.ts
// API endpoint to retry failed AI agent jobs

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic"; // Ensure the route is always dynamic and not cached

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if the job exists and belongs to the project
    const job = await prisma.aIAgentJob.findUnique({
      where: {
        id: jobId,
        projectId: projectId,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset the job to PENDING status
    const updatedJob = await prisma.aIAgentJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        errorMessage: null,
      },
    });

    return NextResponse.json({ job: updatedJob });
  } catch (error: any) {
    console.error("Error retrying job:", error);
    return NextResponse.json({ error: "Failed to retry job" }, { status: 500 });
  }
}
