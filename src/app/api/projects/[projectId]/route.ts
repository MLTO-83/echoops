import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, states } from "@/lib/firebase/db";

// GET /api/projects/:projectId - Retrieve project details
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

    // Fetch the project data
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch state information separately
    let state = null;
    if (project.stateId) {
      state = await states.findById(project.stateId);
    }

    return NextResponse.json({ project: { ...project, state } });
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

    const data = await req.json();

    // Validate project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if state needs updating
    if (data.stateId) {
      // Validate that the state exists
      const stateExists = await states.findById(data.stateId);

      if (!stateExists) {
        return NextResponse.json(
          { error: "Invalid state selected" },
          { status: 400 }
        );
      }
    }

    // Update the project
    const updateData: any = {};
    if (data.stateId) updateData.stateId = data.stateId;

    await projects.update(projectId, updateData);

    // Fetch updated project with state
    const updatedProject = await projects.findById(projectId);
    let state = null;
    if (updatedProject?.stateId) {
      state = await states.findById(updatedProject.stateId);
    }

    return NextResponse.json({ project: { ...updatedProject, state } });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project details" },
      { status: 500 }
    );
  }
}
