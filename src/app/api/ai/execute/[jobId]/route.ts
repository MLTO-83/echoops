import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  // Extract jobId from URL path
  const pathParts = req.nextUrl.pathname.split("/");
  const jobId = pathParts[pathParts.indexOf("execute") + 1];

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  const job = await prisma.aIAgentJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    pullRequestUrl: job.pullRequestUrl,
    errorMessage: job.errorMessage,
    adoWorkItemId: job.adoWorkItemId,
    adoWorkItemTitle: job.adoWorkItemTitle,
    adoWorkItemType: job.adoWorkItemType,
  });
}
