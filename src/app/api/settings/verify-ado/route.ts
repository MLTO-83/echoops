import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * POST /api/settings/verify-ado - Verify ADO connection details
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { adoOrganizationUrl, pat } = data;

    // Basic validation
    if (!adoOrganizationUrl || !pat) {
      return NextResponse.json(
        { error: "Missing ADO organization URL or Personal Access Token" },
        { status: 400 }
      );
    }

    // Format URL properly
    let formattedUrl = adoOrganizationUrl;
    if (!formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    if (formattedUrl.endsWith("/")) {
      formattedUrl = formattedUrl.slice(0, -1);
    }

    // Try to fetch from ADO API to verify credentials
    try {
      // Make request to list projects to verify credentials
      const response = await fetch(
        `${formattedUrl}/_apis/projects?api-version=6.0`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to verify ADO connection: ${response.statusText}`,
            status: response.status,
          },
          { status: 400 }
        );
      }

      // Parse response to get projects
      const data = await response.json();

      return NextResponse.json({
        success: true,
        message: "Successfully connected to ADO organization",
        projectCount: data.count || 0,
      });
    } catch (error) {
      console.error("Error verifying ADO connection:", error);

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to connect to ADO organization. Please check your URL and Personal Access Token.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in verify-ado endpoint:", error);

    return NextResponse.json(
      { error: "Failed to verify ADO connection" },
      { status: 500 }
    );
  }
}
