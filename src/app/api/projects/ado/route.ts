import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, projectMembers, users } from "@/lib/firebase/db";

/**
 * GET /api/projects/ado - Get all imported ADO projects in our system
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all projects that have an adoProjectId (meaning they're linked to ADO)
    const allProjects = await projects.findMany({ adoProjectIdNotNull: true });

    // Fetch members for each project in parallel
    const formattedProjects = await Promise.all(
      allProjects.map(async (project) => {
        const members = await projectMembers.findByProject(project.id);
        const memberCount = members.length;

        return {
          id: project.adoProjectId, // Use ADO project ID as expected by the frontend
          name: project.name,
          description: project.name, // Use project name as description if no description available
          visibility: "private", // Default visibility if not available
          lastUpdated: project.updatedAt instanceof Date
            ? project.updatedAt.toISOString()
            : new Date(project.updatedAt as any).toISOString(),
          localProjectId: project.id, // Store our internal ID
          teamData: {
            teams: [],
            teamCount: 0,
            memberCount: memberCount,
          },
          // Include additional fields that might be useful
          state: null, // State requires separate lookup if needed
          stateId: project.stateId,
          createdAt: project.createdAt instanceof Date
            ? project.createdAt.toISOString()
            : new Date(project.createdAt as any).toISOString(),
          updatedAt: project.updatedAt instanceof Date
            ? project.updatedAt.toISOString()
            : new Date(project.updatedAt as any).toISOString(),
          memberCount: memberCount,
        };
      })
    );

    // Sort by updatedAt desc
    formattedProjects.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

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
