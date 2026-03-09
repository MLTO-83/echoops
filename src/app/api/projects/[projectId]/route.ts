import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// GET /api/projects/:projectId - Retrieve project details
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

    // Fetch the project data with state information
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        state: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error retrieving project:", error);
    return NextResponse.json(
      { error: "Failed to retrieve project details" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/:projectId - Update project details
export async function PATCH(req: NextRequest) {
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

    const data = await req.json();

    // Validate project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if state needs updating
    if (data.stateId) {
      // Validate that the state exists
      const stateExists = await prisma.state.findUnique({
        where: { id: data.stateId },
      });

      if (!stateExists) {
        return NextResponse.json(
          { error: "Invalid state selected" },
          { status: 400 }
        );
      }
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.stateId && { stateId: data.stateId }),
      },
      include: {
        state: true,
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project details" },
      { status: 500 }
    );
  }
}
