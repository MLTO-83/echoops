import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/settings/ado - Get ADO connection details
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

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { organizationId: true },
    });

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "User not associated with an organization" },
        { status: 400 }
      );
    }

    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findUnique({
      where: { organizationId: user.organizationId },
    });

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

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create organization if user doesn't have one
    let organizationId = user.organizationId;
    if (!organizationId) {
      const organization = await prisma.organization.create({
        data: {
          name: "My Organization", // Default name, user can update it later
          users: {
            connect: { id: user.id },
          },
        },
      });
      organizationId = organization.id;

      // Update user with the organization ID
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId },
      });
    }

    // Upsert ADO connection
    const adoConnection = await prisma.aDOConnection.upsert({
      where: { organizationId },
      update: {
        adoOrganizationUrl: formattedUrl,
        pat,
      },
      create: {
        adoOrganizationUrl: formattedUrl,
        pat,
        organization: {
          connect: { id: organizationId },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "ADO connection details saved successfully",
      adoConnection: {
        id: adoConnection.id,
        adoOrganizationUrl: adoConnection.adoOrganizationUrl,
        patConfigured: Boolean(adoConnection.pat),
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
