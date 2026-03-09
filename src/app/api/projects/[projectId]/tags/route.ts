import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, users, programTypes, projectProgramTypes } from "@/lib/firebase/db";

// GET: Fetch tags for a specific project
export async function GET(request: NextRequest) {
  try {
    // Extract projectId from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Check if project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all program types (tags) associated with this project
    const pptList = await projectProgramTypes.findByProject(projectId);

    // Fetch the full programType data for each association in parallel
    const tags = await Promise.all(
      pptList.map(async (ppt) => {
        const pt = await programTypes.findById(ppt.programTypeId);
        return pt;
      })
    );

    // Filter out any nulls (in case a programType was deleted)
    const validTags = tags.filter(Boolean);

    return NextResponse.json({ tags: validTags });
  } catch (error) {
    console.error("Error fetching project tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch project tags" },
      { status: 500 }
    );
  }
}

// PUT: Update tags for a specific project
export async function PUT(request: NextRequest) {
  try {
    // Extract projectId from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    try {
      // Get the user and their organization
      const user = await users.findByEmail(userEmail);

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Check if project exists
      const project = await projects.findById(projectId);

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // For now, allow any authenticated user to add tags
      // This is more permissive than the previous implementation
      // Later we can implement more restrictive permissions if needed

      // Get request body
      const body = await request.json();
      const { tagIds } = body;

      if (!tagIds || !Array.isArray(tagIds)) {
        return NextResponse.json(
          { error: "Tag IDs must be provided as an array" },
          { status: 400 }
        );
      }

      // Delete existing project program type associations
      await projectProgramTypes.deleteAll(projectId);

      // Create new associations one by one to avoid errors
      for (const tagId of tagIds) {
        try {
          await projectProgramTypes.set(projectId, tagId);
        } catch (err) {
          console.error(`Error creating association for tag ${tagId}:`, err);
          // Continue with other tags even if one fails
        }
      }

      // Get all updated tags for the project
      const pptList = await projectProgramTypes.findByProject(projectId);
      const tags = await Promise.all(
        pptList.map(async (ppt) => {
          const pt = await programTypes.findById(ppt.programTypeId);
          return pt;
        })
      );
      const validTags = tags.filter(Boolean);

      return NextResponse.json({ tags: validTags });
    } catch (innerError) {
      console.error("Inner error in PUT tags:", innerError);
      return NextResponse.json(
        {
          error:
            "Error processing request: " +
            (innerError instanceof Error
              ? innerError.message
              : "Unknown error"),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating project tags:", error);
    return NextResponse.json(
      {
        error:
          "Failed to update project tags: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove a tag from a specific project
export async function DELETE(request: NextRequest) {
  try {
    // Extract projectId from URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get the user
    const user = await users.findByEmail(userEmail);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // For now, allow any authenticated user to delete tags
    // This is more permissive than the previous implementation

    // Get request body
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { error: "Tag ID must be provided" },
        { status: 400 }
      );
    }

    // Delete the specific project-tag association
    await projectProgramTypes.delete(projectId, tagId);

    // Get remaining tags for the project
    const pptList = await projectProgramTypes.findByProject(projectId);
    const tags = await Promise.all(
      pptList.map(async (ppt) => {
        const pt = await programTypes.findById(ppt.programTypeId);
        return pt;
      })
    );
    const validTags = tags.filter(Boolean);

    return NextResponse.json({ tags: validTags });
  } catch (error) {
    console.error("Error deleting project tag:", error);
    return NextResponse.json(
      { error: "Failed to delete project tag" },
      { status: 500 }
    );
  }
}
