import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/ado/projects/[projectId]/repos
 * Fetches repositories from Azure DevOps for the given project ID
 * Note: Any authenticated user can access this endpoint, project membership is not required
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - only requirement is that user is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract projectId from the URL path
    const pathParts = request.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get the project to find the ADO project name - no membership check is done
    // This allows any authenticated user to access the repo list, even if they're not a project member
    // Try to find by both local project ID and ADO project ID to be more flexible
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectId }, { adoProjectId: projectId }],
      },
      include: {
        adoConnection: {
          include: { organization: true },
        },
      },
    });

    if (!project) {
      console.error(`Project not found for ID: ${projectId}`);
      return NextResponse.json(
        {
          error: "Project not found",
          requestedProjectId: projectId,
        },
        { status: 404 }
      );
    }

    if (!project.adoConnection) {
      return NextResponse.json(
        { error: "Project does not have an ADO connection configured" },
        { status: 400 }
      );
    }

    // Get ADO connection details to make the API call
    const adoConnection = project.adoConnection;

    // Use adoProjectId instead of adoProjectName (which doesn't exist in the schema)
    // Fall back to the project name if adoProjectId is not available
    const adoProjectName = project.adoProjectId || project.name;

    // Format URL properly
    const baseUrl = adoConnection.adoOrganizationUrl;
    const apiVersion = "7.0"; // Using ADO API version 7.0

    // Build the URL to fetch repositories for this project
    const apiUrl = `${baseUrl}/${adoProjectName}/_apis/git/repositories?api-version=${apiVersion}`;

    // Make API call to Azure DevOps
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("ADO API Error:", await response.text());
      return NextResponse.json(
        {
          error: `Failed to fetch repositories: ${response.status} ${response.statusText}`,
          adoProjectName,
        },
        { status: response.status }
      );
    }

    // Parse the response
    const data = await response.json();

    // Transform ADO API response to our format
    const repositories = data.value.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      url: repo.webUrl,
      defaultBranch: repo.defaultBranch,
      projectId: projectId,
    }));

    return NextResponse.json({
      repositories,
      adoProjectName,
      count: repositories.length,
    });
  } catch (error) {
    console.error("Error fetching ADO repositories:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch repositories",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
