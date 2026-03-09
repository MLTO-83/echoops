import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, adoConnections } from "@/lib/firebase/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pat, orgUrl } = await request.json();

    // Validate input
    if (!pat || !orgUrl) {
      return NextResponse.json(
        { error: "Personal Access Token and Organization URL are required" },
        { status: 400 }
      );
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get the user from database
    const user = await users.findByEmail(userEmail);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let organizationId = user.organizationId;

    // If the user doesn't have an organization, create one
    if (!organizationId) {
      const organization = await organizations.create({
        name: `${user.name || "New"}'s Organization`,
      });

      // Update the user with the new organization
      await users.update(user.id, { organizationId: organization.id });
      organizationId = organization.id;
    }

    // Create or update the ADO Connection with the PAT (upsert handles both cases)
    await adoConnections.upsert(organizationId, {
      pat,
      adoOrganizationUrl: orgUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving ADO connection:", error);
    return NextResponse.json(
      { error: "Failed to save Azure DevOps connection" },
      { status: 500 }
    );
  }
}
