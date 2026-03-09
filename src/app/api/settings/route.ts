import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, adoConnections } from "@/lib/firebase/db";

/**
 * GET /api/settings - Retrieve user and organization settings
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

    const user = await users.findByEmail(session.user.email as string);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch organization and ADO connection in parallel if user has an org
    let organization = null;
    let adoConnection = null;

    if (user.organizationId) {
      [organization, adoConnection] = await Promise.all([
        organizations.findById(user.organizationId),
        adoConnections.findByOrganizationId(user.organizationId),
      ]);
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
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
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
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { theme, maxHoursPerWeek, organizationName } = data;

    const user = await users.findByEmail(session.user.email as string);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user settings
    const userUpdateData: any = {};
    if (theme) userUpdateData.theme = theme;
    if (maxHoursPerWeek) userUpdateData.maxHoursPerWeek = parseFloat(maxHoursPerWeek);

    if (Object.keys(userUpdateData).length > 0) {
      await users.update(user.id, userUpdateData);
    }

    const updatedUser = await users.findById(user.id);

    // Handle organization name update if provided
    let organization = user.organizationId
      ? await organizations.findById(user.organizationId)
      : null;

    if (organizationName) {
      if (user.organizationId) {
        // Update existing organization
        await organizations.update(user.organizationId, { name: organizationName });
        organization = await organizations.findById(user.organizationId);
      } else {
        // Create new organization and associate user with it
        const org = await organizations.create({ name: organizationName });
        await users.update(user.id, { organizationId: org.id });
        organization = org;
      }
    }

    return NextResponse.json({
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        organizationId: updatedUser!.organizationId,
        theme: updatedUser!.theme,
        maxHoursPerWeek: updatedUser!.maxHoursPerWeek,
        licenseType: updatedUser!.licenseType,
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
