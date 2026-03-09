export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, adoConnections } from "@/lib/firebase/db";

/**
 * GET /api/ado/projects/[projectId]/teams - Fetch teams for a specific ADO project
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
    const projectId = pathParts[pathParts.indexOf("projects") + 1];

    // Get user's organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get ADO connection details
    const adoConnection = await adoConnections.findByOrganizationId(
      user.organizationId
    );

    if (!adoConnection) {
      return NextResponse.json(
        { error: "No ADO connection configured", teams: [] },
        { status: 200 }
      );
    }

    // Format the URL properly
    let url = adoConnection.adoOrganizationUrl;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    try {
      // Fetch teams for the project
      const response = await fetch(
        `${url}/_apis/projects/${projectId}/teams?api-version=6.0`,
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
            error: `Failed to fetch teams: ${response.statusText}`,
            teams: [],
          },
          { status: 200 }
        );
      }

      const data = await response.json();

      // Transform the teams to the format expected by the frontend
      const teams = data.value.map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        url: team.url,
        projectId: projectId,
        projectName: team.projectName,
      }));

      return NextResponse.json({ teams });
    } catch (error) {
      console.error(`Error fetching teams for project ${projectId}:`, error);
      return NextResponse.json(
        {
          error: "Failed to communicate with Azure DevOps API",
          teams: [],
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error in teams endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams", teams: [] },
      { status: 500 }
    );
  }
}
