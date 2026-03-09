import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { getCurrentWeekAndYear } from "@/lib/date-utils";

// POST /api/projects/:projectId/manager - Set a project manager (OWNER role)
export async function POST(req: NextRequest) {
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

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
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

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Begin a transaction to ensure consistency
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Find current project manager (if any)
      const currentManager = await prisma.projectMember.findFirst({
        where: {
          projectId: projectId,
          role: "OWNER",
        },
      });

      // 2. If there is a current manager, demote to regular member
      if (currentManager) {
        if (currentManager.userId === userId) {
          // The requested user is already the manager
          return currentManager;
        }

        await prisma.projectMember.update({
          where: {
            userId_projectId: {
              userId: currentManager.userId,
              projectId: projectId,
            },
          },
          data: {
            role: "MEMBER",
          },
        });
      }

      // 3. Check if the new manager is already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: userId,
            projectId: projectId,
          },
        },
      });

      // 4. Either update existing member to OWNER or create new member as OWNER
      if (existingMember) {
        // Update the role to OWNER
        return prisma.projectMember.update({
          where: {
            userId_projectId: {
              userId: userId,
              projectId: projectId,
            },
          },
          data: {
            role: "OWNER",
          },
        });
      } else {
        // Get current week and year
        const { weekNumber, year } = getCurrentWeekAndYear();

        // Create a new member with OWNER role and set weekly hours to 0
        return prisma.projectMember.create({
          data: {
            userId: userId,
            projectId: projectId,
            role: "OWNER",
            weeklyHours: {
              create: {
                year: year,
                weekNumber: weekNumber,
                hours: 0,
              },
            },
          },
        });
      }
    });

    return NextResponse.json({ manager: result });
  } catch (error) {
    console.error("Error setting project manager:", error);
    return NextResponse.json(
      { error: "Failed to set project manager" },
      { status: 500 }
    );
  }
}
