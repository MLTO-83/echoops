import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * API Route handler for project member operations
 * Route: /api/projects/:projectId/members
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Allow access to view project members for all authenticated users
    // Note: This removes the restriction that the user must be a project member

    // Fetch project members
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        weeklyHours: true,
      },
      orderBy: { role: "asc" },
    });

    // Organize the data for the response
    const formattedMembers = projectMembers.map((member) => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      weeklyHours: member.weeklyHours,
      user: {
        id: member.user.id,
        name: member.user.name || "Unknown User",
        email: member.user.email || "no-email@example.com",
        image: member.user.image,
      },
    }));

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
        { error: "Missing projectId parameter" },
        { status: 400 }
      );
    }

    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // DEVELOPMENT MODE: Skip permission check and allow any authenticated user to add members
    // TODO: Restore permission check for production
    /* 
    // Verify the user has admin access to the project
    const userEmail = session.user.email as string;
    const userAccess = await prisma.projectMember.findFirst({
      where: {
        project: { id: projectId },
        user: { email: userEmail },
        role: { in: ["OWNER", "MANAGER"] },
      },
    });

    // If user is not a manager or owner, deny access
    if (!userAccess) {
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
      targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });
    } else if (email) {
      targetUser = await prisma.user.findFirst({
        where: { email },
      });

      // If user doesn't exist, create them
      if (!targetUser) {
        targetUser = await prisma.user.create({
          data: {
            email,
            name: email.split("@")[0], // Simple name from email
          },
        });
      }
    } else {
      return NextResponse.json(
        { error: "Either userId or email must be provided" },
        { status: 400 }
      );
    }

    // Check if user already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: targetUser.id,
      },
    });

    if (existingMember) {
      // Member already exists: return success to avoid client-side 409 conflicts
      return NextResponse.json(
        { success: true, message: "User already a member of this project" },
        { status: 200 }
      );
    }

    // Add the user as a project member
    const newMember = await prisma.projectMember.create({
      data: {
        userId: targetUser.id,
        projectId,
        role: role || "MEMBER",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        role: newMember.role,
        user: newMember.user,
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

    const { userId, hoursPerWeek, hoursPerMonth, role } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Update project member
    const updatedMember = await prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId,
        },
      },
      data: {
        role: role || undefined,
      },
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
    const session = await getServerSession(authOptions);

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
    const requestorAccess = await prisma.projectMember.findFirst({
      where: {
        project: { id: projectId },
        user: { email: requestorEmail },
        role: { in: ["OWNER", "MANAGER"] },
      },
    });

    if (!requestorAccess) {
      return NextResponse.json(
        {
          error:
            "You don't have permission to remove members from this project",
        },
        { status: 403 }
      );
    }

    // Delete the project member
    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: userId,
          projectId: projectId,
        },
      },
    });

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
