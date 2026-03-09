import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/projects/ado - Get all imported ADO projects in our system
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all projects that have an adoProjectId (meaning they're linked to ADO)
    const projects = await prisma.project.findMany({
      where: {
        adoProjectId: {
          not: null,
        },
      },
      include: {
        state: true,
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Transform the data to match the structure expected by the frontend
    const formattedProjects = projects.map((project) => {
      // Calculate team and member count
      const memberCount = project.members.length;

      return {
        id: project.adoProjectId, // Use ADO project ID as expected by the frontend
        name: project.name,
        description: project.name, // Use project name as description if no description available
        visibility: "private", // Default visibility if not available
        lastUpdated: project.updatedAt.toISOString(), // Format date for frontend
        localProjectId: project.id, // Store our internal ID
        teamData: {
          teams: [],
          teamCount: 0,
          memberCount: memberCount,
        },
        // Include additional fields that might be useful
        state: project.state,
        stateId: project.stateId,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        memberCount: memberCount,
      };
    });

    return NextResponse.json({
      projects: formattedProjects,
    });
  } catch (error) {
    console.error("Error retrieving ADO projects:", error);
    return NextResponse.json(
      { error: "Failed to retrieve ADO projects" },
      { status: 500 }
    );
  }
}
