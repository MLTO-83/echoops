import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, adoConnections } from "@/lib/firebase/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/ado/projects/[projectId]/teams/[teamId]/members - Get members of a specific team in an ADO project
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

    // Extract parameters from URL path
    const pathParts = req.nextUrl.pathname.split("/");
    const projectId = pathParts[pathParts.indexOf("projects") + 1];
    const teamId = pathParts[pathParts.indexOf("teams") + 1];

    // Get user with organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get the ADO connection details
    const adoConnection = await adoConnections.findByOrganizationId(
      user.organizationId
    );

    if (!adoConnection) {
      return NextResponse.json(
        { error: "No ADO connection configured", members: [] },
        { status: 200 } // Return empty list instead of error for better UX
      );
    }

    // Format the URL properly
    let url = adoConnection.adoOrganizationUrl;
    if (url.endsWith("/")) {
      url = url.slice(0, -1);
    }

    try {
      // Fetch team members from Azure DevOps API
      const response = await fetch(
        `${url}/_apis/projects/${projectId}/teams/${teamId}/members?api-version=6.0`,
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
            error: `Failed to fetch team members: ${response.statusText}`,
            members: [],
          },
          { status: response.status === 404 ? 404 : 200 } // Return 404 if team not found, otherwise 200 with error info
        );
      }

      const data = await response.json();

      // Map and transform the members data for our frontend
      const members = data.value.map((member: any) => ({
        id: member.id || member.identity?.id,
        displayName: member.displayName || member.identity?.displayName,
        uniqueName: member.uniqueName || member.identity?.uniqueName,
        email: member.uniqueName || member.identity?.uniqueName, // ADO often uses uniqueName for email
        imageUrl: member.imageUrl || member.identity?.imageUrl,
        isTeamAdmin: member.isTeamAdmin || false,
        teamId: teamId,
        projectId: projectId,
      }));

      // Check for any already synced members in our database
      const adoUserIds = members
        .map((m: any) => m.id)
        .filter((id: any) => id !== undefined && id !== null);

      // Look up existing users by ADO user IDs
      const existingUserResults = await Promise.all(
        adoUserIds.map((adoUserId: string) => users.findByAdoUserId(adoUserId))
      );

      // Map ADO user IDs to our database user IDs
      const adoToDbUserMap: Record<string, string> = {};
      existingUserResults.forEach((foundUser) => {
        if (foundUser && foundUser.adoUserId) {
          adoToDbUserMap[foundUser.adoUserId] = foundUser.id;
        }
      });

      // Add our database IDs to the response if available
      const enrichedMembers = members.map((member: any) => ({
        ...member,
        dbUserId: member.id ? adoToDbUserMap[member.id] : undefined,
        isSynced: member.id ? !!adoToDbUserMap[member.id] : false,
      }));

      return NextResponse.json({
        members: enrichedMembers,
        _rawCount: data.count,
      });
    } catch (error) {
      console.error(`Error fetching members for team ${teamId}:`, error);
      return NextResponse.json(
        {
          error: "Failed to communicate with Azure DevOps API",
          members: [],
        },
        { status: 200 } // Return empty list with error message
      );
    }
  } catch (error) {
    console.error("Error in team members endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members", members: [] },
      { status: 500 }
    );
  }
}
