import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, aiAgentSettings } from "@/lib/firebase/db";

// GET - Fetch user profile information including license type
export async function GET(req: NextRequest) {
  try {
    console.log("User Profile API: GET request received");

    // Get the user's session
    const session = await getSession();
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
    const user = await users.findByEmail(session.user.email);

    if (!user) {
      console.log(
        `User Profile API: User not found for email: ${session.user.email}`
      );
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch AI agent settings for this user
    const agentSettings = await aiAgentSettings.findAll();
    const userAgentSettings = agentSettings.filter(
      (s: any) => s.userId === user.id
    );

    const userWithSettings = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      theme: user.theme,
      licenseType: user.licenseType,
      maxHoursPerWeek: user.maxHoursPerWeek,
      aiAgentSettings: userAgentSettings.map((s: any) => ({
        id: s.id,
        isActive: s.isActive,
      })),
    };

    console.log(
      `User Profile API: Successfully retrieved profile for user ${user.id}`
    );
    return NextResponse.json({ user: userWithSettings });
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
    const session = await getSession();
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

    // Find user first
    const user = await users.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (licenseType) updateData.licenseType = licenseType;
    if (maxHoursPerWeek !== undefined)
      updateData.maxHoursPerWeek = maxHoursPerWeek;

    // Update user profile
    await users.update(user.id, updateData);
    const updatedUser = await users.findById(user.id);

    console.log(
      `User Profile API: Successfully updated profile for user ${user.id}`
    );
    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        image: updatedUser!.image,
        licenseType: updatedUser!.licenseType,
        maxHoursPerWeek: updatedUser!.maxHoursPerWeek,
      },
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
