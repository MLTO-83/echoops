import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

// Get all program types (tags) for an organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get all program types (tags) for the organization
    const programTypes = await prisma.programType.findMany({
      where: { organizationId: user.organization.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ programTypes });
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
    const session = await getServerSession(authOptions);

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
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
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

    // Check if program type already exists
    const existingProgramType = await prisma.programType.findFirst({
      where: {
        organizationId: user.organization.id,
        name: {
          equals: name,
          mode: "insensitive", // Case insensitive search
        },
      },
    });

    if (existingProgramType) {
      return NextResponse.json(
        { error: "Program type with this name already exists" },
        { status: 409 }
      );
    }

    // Create new program type (tag)
    const programType = await prisma.programType.create({
      data: {
        name,
        description,
        organization: {
          connect: { id: user.organization.id },
        },
      },
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
