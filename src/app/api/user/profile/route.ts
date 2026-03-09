import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/auth";

// GET - Fetch user profile information including license type
export async function GET(req: NextRequest) {
  try {
    console.log("User Profile API: GET request received");

    // Get the user's session
    const session = await getServerSession(authOptions);
    console.log(
      "User Profile API: Session retrieved:",
      JSON.stringify(session?.user || {}, null, 2)
    );

    if (!session || !session.user?.email) {
      console.log(
        "User Profile API: Unauthorized access attempt - no valid session"
      );
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    console.log(
      `User Profile API: Looking up user profile for ${session.user.email}`
    );

    // Get user information including license type
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        theme: true,
        licenseType: true,
        maxHoursPerWeek: true,
        aiAgentSettings: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      console.log(
        `User Profile API: User not found for email: ${session.user.email}`
      );
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      `User Profile API: Successfully retrieved profile for user ${user.id}`
    );
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while fetching user profile: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

// PATCH - Update license type and other profile settings
export async function PATCH(req: NextRequest) {
  try {
    console.log("User Profile API: PATCH request received");

    // Get the user's session
    const session = await getServerSession(authOptions);
    console.log(
      "User Profile API: Session retrieved:",
      JSON.stringify(session?.user || {}, null, 2)
    );

    if (!session || !session.user?.email) {
      console.log(
        "User Profile API: Unauthorized access attempt - no valid session"
      );
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log(
      "User Profile API: Request body received:",
      JSON.stringify(body, null, 2)
    );

    // Extract fields to update
    const { licenseType, maxHoursPerWeek } = body;

    // Validate license type
    if (licenseType && !["FREE", "BASIC", "AI_AGENT"].includes(licenseType)) {
      return NextResponse.json(
        { error: "Invalid license type. Must be FREE, BASIC, or AI_AGENT" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (licenseType) updateData.licenseType = licenseType;
    if (maxHoursPerWeek !== undefined)
      updateData.maxHoursPerWeek = maxHoursPerWeek;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        licenseType: true,
        maxHoursPerWeek: true,
      },
    });

    console.log(
      `User Profile API: Successfully updated profile for user ${updatedUser.id}`
    );
    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while updating user profile: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
