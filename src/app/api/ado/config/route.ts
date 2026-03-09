import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/ado/config - Retrieve ADO connection configuration
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required", configured: false, valid: false },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { organizationId: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        {
          error: "User not associated with an organization",
          configured: false,
          valid: false,
          message: "You need to create an organization in settings first.",
        },
        { status: 200 }
      );
    }

    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!adoConnection) {
      return NextResponse.json(
        {
          error: "No ADO connection configured",
          configured: false,
          valid: false,
          message:
            "Azure DevOps connection is not configured. Please set up your connection in settings.",
        },
        { status: 200 }
      );
    }

    // Validate the connection by making a test API call
    let isValid = false;
    let validationMessage = "";

    try {
      // Format URL properly
      let url = adoConnection.adoOrganizationUrl;
      if (!url.startsWith("https://")) {
        url = `https://${url}`;
      }
      if (url.endsWith("/")) {
        url = url.slice(0, -1);
      }

      // Make a test call to the ADO API
      const response = await fetch(
        `${url}/_apis/projects?$top=1&api-version=6.0`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `:${adoConnection.pat}`
            ).toString("base64")}`,
          },
        }
      );

      isValid = response.ok;

      if (!response.ok) {
        validationMessage = `Azure DevOps API returned status: ${response.status} - ${response.statusText}`;
      }
    } catch (error) {
      console.error("Error validating ADO connection:", error);
      validationMessage =
        error instanceof Error ? error.message : "Connection validation failed";
    }

    return NextResponse.json({
      configured: true,
      valid: isValid,
      url: adoConnection.adoOrganizationUrl,
      patConfigured: Boolean(adoConnection.pat),
      message: isValid
        ? "Azure DevOps connection configured correctly"
        : validationMessage,
      errorType: isValid ? null : "validation",
    });
  } catch (error) {
    console.error("Error retrieving ADO configuration:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve ADO configuration",
        configured: false,
        valid: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
