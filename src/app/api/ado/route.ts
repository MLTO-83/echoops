import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let organization = user.organization;

    // If the user doesn't have an organization, create one
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: `${user.name || "New"}'s Organization`,
          users: {
            connect: { id: user.id },
          },
        },
      });

      // Update the user with the new organization
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      });
    }

    // Check if an ADOConnection already exists for this organization
    const existingConnection = await prisma.aDOConnection.findUnique({
      where: { organizationId: organization.id },
    });

    // Create or update the ADO Connection with the PAT
    if (existingConnection) {
      // Update existing connection
      await prisma.aDOConnection.update({
        where: { id: existingConnection.id },
        data: {
          pat,
          adoOrganizationUrl: orgUrl,
        },
      });
    } else {
      // Create new connection
      await prisma.aDOConnection.create({
        data: {
          pat,
          adoOrganizationUrl: orgUrl,
          organization: {
            connect: { id: organization.id },
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving ADO connection:", error);
    return NextResponse.json(
      { error: "Failed to save Azure DevOps connection" },
      { status: 500 }
    );
  }
}
