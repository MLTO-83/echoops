import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { projects, users, projectMembers, adoConnections } from "@/lib/firebase/db";

/**
 * GET /api/projects/ado/[projectId] - Get details of a specific project from ADO and local database
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

    // Extract projectId from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("ado") + 1];

    // First, check if the project exists in our database
    const localProject = await projects.findByAdoProjectId(projectId);

    // If we don't have the project in our database, we'll return a minimal response
    if (!localProject) {
      return NextResponse.json({
        exists: false,
        message: "Project not found in local database",
      });
    }

    // Fetch members for the project
    const members = await projectMembers.findByProject(localProject.id);
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const memberUser = await users.findById(member.userId);
        return { ...member, user: memberUser };
      })
    );

    const projectWithMembers = {
      ...localProject,
      members: membersWithUsers,
      state: null, // State would need separate lookup
    };

    // Get user's organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        {
          exists: true,
          project: projectWithMembers,
          adoDetails: null,
          message: "User not associated with an organization",
        },
        { status: 200 }
      );
    }

    // Get ADO connection details
    const adoConnection = await adoConnections.findByOrganizationId(user.organizationId);

    if (!adoConnection) {
      return NextResponse.json(
        {
          exists: true,
          project: projectWithMembers,
          adoDetails: null,
          message: "No ADO connection configured",
        },
        { status: 200 }
      );
    }

    // Format the URL properly
    let url = adoConnection.adoOrganizationUrl;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    try {
      // Fetch project details from ADO
      const response = await fetch(
        `${url}/_apis/projects/${projectId}?api-version=6.0&includeCapabilities=true`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `:${adoConnection.pat}`
            ).toString("base64")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`ADO API returned status: ${response.status}`);
        return NextResponse.json(
          {
            exists: true,
            project: projectWithMembers,
            adoDetails: null,
            error: `Failed to fetch ADO details: ${response.statusText}`,
          },
          { status: 200 }
        );
      }

      const adoProject = await response.json();

      // Format the response with both local and ADO details
      return NextResponse.json({
        exists: true,
        project: projectWithMembers,
        adoDetails: {
          id: adoProject.id,
          name: adoProject.name,
          description: adoProject.description,
          url: adoProject.url,
          state: adoProject.state,
          revision: adoProject.revision,
          visibility: adoProject.visibility,
          lastUpdateTime: adoProject.lastUpdateTime,
          capabilities: adoProject.capabilities,
        },
      });
    } catch (error) {
      console.error(`Error fetching project details from ADO:`, error);
      return NextResponse.json(
        {
          exists: true,
          project: projectWithMembers,
          adoDetails: null,
          error: "Failed to communicate with Azure DevOps API",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in project details endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch project details" },
      { status: 500 }
    );
  }
}
