import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, organizations, programTypes } from "@/lib/firebase/db";

// Get all program types (tags) for an organization
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get the user and their organization
    const user = await users.findByEmail(userEmail);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organization = await organizations.findById(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get all program types (tags) for the organization
    const orgProgramTypes = await programTypes.findByOrganization(organization.id);

    // Sort by name ascending
    orgProgramTypes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return NextResponse.json({ programTypes: orgProgramTypes });
  } catch (error) {
    console.error("Error fetching program types:", error);
    return NextResponse.json(
      { error: "Failed to fetch program types" },
      { status: 500 }
    );
  }
}

// Create a new program type (tag)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from session
    const userEmail = session.user.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Get the user and their organization
    const user = await users.findByEmail(userEmail);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organization = await organizations.findById(user.organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if program type already exists (case insensitive)
    const existingProgramType = await programTypes.findByOrgAndName(
      organization.id,
      name
    );

    if (existingProgramType) {
      return NextResponse.json(
        { error: "Program type with this name already exists" },
        { status: 409 }
      );
    }

    // Create new program type (tag)
    const programType = await programTypes.create({
      name,
      description,
      organizationId: organization.id,
    });

    return NextResponse.json({ programType }, { status: 201 });
  } catch (error) {
    console.error("Error creating program type:", error);
    return NextResponse.json(
      { error: "Failed to create program type" },
      { status: 500 }
    );
  }
}
