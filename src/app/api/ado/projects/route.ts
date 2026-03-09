export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, adoConnections } from "@/lib/firebase/db";

/**
 * GET /api/ado/projects - Fetch projects from Azure DevOps
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

    // Get user and their organization
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
        {
          error: "No ADO connection configured",
          projects: [],
        },
        { status: 200 } // Return empty list instead of error for better UX
      );
    }

    // Format the URL properly
    let url = adoConnection.adoOrganizationUrl;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    // Fetch projects from ADO API
    try {
      const response = await fetch(`${url}/_apis/projects?api-version=6.0`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString(
            "base64"
          )}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`ADO API returned status: ${response.status}`);
        return NextResponse.json(
          {
            error: `Failed to fetch projects: ${response.statusText}`,
            projects: [],
          },
          { status: 200 } // Return empty list with error message for better UX
        );
      }

      const data = await response.json();

      // Transform the projects to the format required by the frontend
      const projectsList = data.value.map((project: any) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        url: project.url,
        state: project.state,
        lastUpdateTime: project.lastUpdateTime,
      }));

      return NextResponse.json({ projects: projectsList });
    } catch (error) {
      console.error("Error calling ADO API:", error);
      return NextResponse.json(
        {
          error: "Failed to communicate with Azure DevOps API",
          projects: [],
        },
        { status: 200 } // Return empty list with error message
      );
    }
  } catch (error) {
    console.error("Error fetching ADO projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects from ADO" },
      { status: 500 }
    );
  }
}
