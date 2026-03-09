import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/settings - Retrieve user and organization settings
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get ADO connection details if the user has an organization
    let adoConnection = null;
    if (user.organizationId) {
      adoConnection = await prisma.aDOConnection.findUnique({
        where: { organizationId: user.organizationId },
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        theme: user.theme,
        maxHoursPerWeek: user.maxHoursPerWeek,
        licenseType: user.licenseType,
      },
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
          }
        : null,
      adoConnection: adoConnection
        ? {
            id: adoConnection.id,
            adoOrganizationUrl: adoConnection.adoOrganizationUrl,
            // We don't return the PAT for security reasons
            patConfigured: Boolean(adoConnection.pat),
          }
        : null,
    });
  } catch (error) {
    console.error("Error retrieving settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings - Update user settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { theme, maxHoursPerWeek, organizationName } = data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(theme && { theme }),
        ...(maxHoursPerWeek && {
          maxHoursPerWeek: parseFloat(maxHoursPerWeek),
        }),
      },
      include: { organization: true },
    });

    // Handle organization name update if provided
    let organization = updatedUser.organization;
    if (organizationName) {
      if (user.organizationId) {
        // Update existing organization
        organization = await prisma.organization.update({
          where: { id: user.organizationId },
          data: { name: organizationName },
        });
      } else {
        // Create new organization and associate user with it
        organization = await prisma.organization.create({
          data: {
            name: organizationName,
            users: {
              connect: { id: user.id },
            },
          },
        });

        // Update user with the new organization
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: organization.id },
        });
      }
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        organizationId: updatedUser.organizationId,
        theme: updatedUser.theme,
        maxHoursPerWeek: updatedUser.maxHoursPerWeek,
        licenseType: updatedUser.licenseType,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
