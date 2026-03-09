import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, adoConnections } from "@/lib/firebase/db";

/**
 * GET /api/settings/ado - Get ADO connection details
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

    // Get user with organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get ADO connection details
    const adoConnection = await adoConnections.findByOrganizationId(user.organizationId);

    if (!adoConnection) {
      return NextResponse.json(
        { error: "No ADO connection configured for this organization" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      adoOrganizationUrl: adoConnection.adoOrganizationUrl,
      // We don't return the PAT for security reasons
      patConfigured: Boolean(adoConnection.pat),
    });
  } catch (error) {
    console.error("Error retrieving ADO settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve ADO settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/ado - Create or update ADO connection
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
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

    // Get user with organization
    const user = await users.findByEmail(session.user.email as string);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create organization if user doesn't have one
    let organizationId = user.organizationId;
    if (!organizationId) {
      const org = await organizations.create({
        name: "My Organization", // Default name, user can update it later
      });
      organizationId = org.id;

      // Update user with the organization ID
      await users.update(user.id, { organizationId });
    }

    // Upsert ADO connection
    await adoConnections.upsert(organizationId, {
      adoOrganizationUrl: formattedUrl,
      pat,
    });

    const adoConnection = await adoConnections.findByOrganizationId(organizationId);

    return NextResponse.json({
      success: true,
      message: "ADO connection details saved successfully",
      adoConnection: {
        id: adoConnection!.id,
        adoOrganizationUrl: adoConnection!.adoOrganizationUrl,
        patConfigured: Boolean(adoConnection!.pat),
      },
    });
  } catch (error) {
    console.error("Error saving ADO settings:", error);
    return NextResponse.json(
      { error: "Failed to save ADO settings" },
      { status: 500 }
    );
  }
}
