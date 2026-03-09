import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, projectMembers, users } from "@/lib/firebase/db";

/**
 * API Route handler for project member operations
 * Route: /api/projects/:projectId/members
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId parameter" },
        { status: 400 }
      );
    }

    console.log(`Fetching members for project ID: ${projectId}`);

    // Verify the project exists first
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow access to view project members for all authenticated users
    // Note: This removes the restriction that the user must be a project member

    // Fetch project members
    const members = await projectMembers.findByProject(projectId);

    // Fetch user data and weekly hours in parallel for each member
    const formattedMembers = await Promise.all(
      members.map(async (member) => {
        const [user, weeklyHours] = await Promise.all([
          users.findById(member.userId),
          import("@/lib/firebase/db").then((db) =>
            db.projectMemberWeeklyHours.findByMember(projectId, member.userId)
          ),
        ]);

        return {
          id: `${member.userId}_${member.projectId}`,
          userId: member.userId,
          role: member.role,
          weeklyHours,
          user: {
            id: user?.id || member.userId,
            name: user?.name || "Unknown User",
            email: user?.email || "no-email@example.com",
            image: user?.image || null,
          },
        };
      })
    );

    // Sort by role ascending
    formattedMembers.sort((a, b) => a.role.localeCompare(b.role));

    return NextResponse.json({
      success: true,
      count: formattedMembers.length,
      members: formattedMembers,
    });
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch project members",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Add a new member to a project
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
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
        { error: "Missing projectId parameter" },
        { status: 400 }
      );
    }

    // Check if the project exists
    const project = await projects.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // DEVELOPMENT MODE: Skip permission check and allow any authenticated user to add members
    // TODO: Restore permission check for production
    /*
    // Verify the user has admin access to the project
    const userEmail = session.user.email as string;
    const userAccess = await projectMembers.findByUserAndProject(session.user.id, projectId);
    // Check role
    if (!userAccess || !["OWNER", "MANAGER"].includes(userAccess.role)) {
      return NextResponse.json(
        { error: "You don't have permission to add members to this project" },
        { status: 403 }
      );
    }
    */

    console.log(
      `Adding member to project ${projectId} by user ${session.user.email}`
    );

    // Parse the request body
    const body = await req.json();
    const { userId, email, role } = body;

    // User can be identified either by userId or email
    let targetUser;

    if (userId) {
      targetUser = await users.findById(userId);
    } else if (email) {
      targetUser = await users.findByEmail(email);

      // If user doesn't exist, create them
      if (!targetUser) {
        targetUser = await users.create({
          email,
          name: email.split("@")[0], // Simple name from email
        });
      }
    } else {
      return NextResponse.json(
        { error: "Either userId or email must be provided" },
        { status: 400 }
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already a member
    const existingMember = await projectMembers.findByUserAndProject(
      targetUser.id,
      projectId
    );

    if (existingMember) {
      // Member already exists: return success to avoid client-side 409 conflicts
      return NextResponse.json(
        { success: true, message: "User already a member of this project" },
        { status: 200 }
      );
    }

    // Add the user as a project member
    const newMember = await projectMembers.create({
      userId: targetUser.id,
      projectId,
      role: role || "MEMBER",
    });

    // Fetch the user data for the response
    const memberUser = await users.findById(targetUser.id);

    return NextResponse.json({
      success: true,
      member: {
        id: `${newMember.userId}_${newMember.projectId}`,
        role: newMember.role,
        user: {
          id: memberUser?.id || targetUser.id,
          name: memberUser?.name || null,
          email: memberUser?.email || null,
          image: memberUser?.image || null,
        },
      },
    });
  } catch (error) {
    console.error("Error adding project member:", error);
    return NextResponse.json(
      {
        error: "Failed to add project member",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:projectId/members - Update a project member
export async function PUT(req: NextRequest) {
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

    const { userId, hoursPerWeek, hoursPerMonth, role } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Update project member
    const updatedMember = await projectMembers.update(projectId, userId, {
      role: role || undefined,
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error("Error updating project member:", error);
    return NextResponse.json(
      { error: "Failed to update project member" },
      { status: 500 }
    );
  }
}

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

    // Extract projectId and userId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Extract the userId from the URL path
    const url = req.url;
    const parts = url.split("/");
    const userIdIndex = parts.findIndex((part) => part === "members") + 1;
    const userId = userIdIndex < parts.length ? parts[userIdIndex] : null;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify the requestor has admin access to the project
    const requestorEmail = session.user.email as string;
    const requestorUser = await users.findByEmail(requestorEmail);
    if (requestorUser) {
      const requestorAccess = await projectMembers.findByUserAndProject(
        requestorUser.id,
        projectId
      );

      if (!requestorAccess || !["OWNER", "MANAGER"].includes(requestorAccess.role)) {
        return NextResponse.json(
          {
            error:
              "You don't have permission to remove members from this project",
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "You don't have permission to remove members from this project",
        },
        { status: 403 }
      );
    }

    // Delete the project member
    await projectMembers.delete(projectId, userId);

    return NextResponse.json({
      success: true,
      message: "Member removed from project",
    });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json(
      { error: "Failed to remove project member" },
      { status: 500 }
    );
  }
}
