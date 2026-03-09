import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users } from "@/lib/firebase/db";

// GET - Fetch current user theme preference
export async function GET(req: NextRequest) {
  try {
    console.log("Theme API: GET request received");

    // Get the user's session using the authOptions
    const session = await getSession();
    console.log(
      "Theme API: Session retrieved:",
      JSON.stringify(session?.user || {}, null, 2)
    );

    if (!session || !session.user?.email) {
      console.log("Theme API: Unauthorized access attempt - no valid session");
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    console.log(`Theme API: Looking up theme for user ${session.user.email}`);

    // Retrieve user theme preference directly
    try {
      const user = await users.findByEmail(session.user.email);

      console.log(
        `Theme API: User lookup result:`,
        JSON.stringify(user, null, 2)
      );

      if (!user) {
        console.log(
          `Theme API: User not found for email: ${session.user.email}`
        );
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      console.log(
        `Theme API: Successfully retrieved theme: ${user.theme} for user ${user.id}`
      );
      return NextResponse.json({ theme: user.theme });
    } catch (queryError) {
      console.error("Theme API: Error querying user:", queryError);
      return NextResponse.json(
        {
          error:
            "Database error: " +
            (queryError instanceof Error
              ? queryError.message
              : String(queryError)),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching user theme:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while fetching theme preference: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

// POST - Update user theme preference
export async function POST(req: NextRequest) {
  try {
    console.log("Theme API POST: Request received");

    const session = await getSession();
    console.log(
      "Theme API POST: Session retrieved:",
      JSON.stringify(session?.user || {}, null, 2)
    );

    if (!session || !session.user?.email) {
      console.log("Theme API POST: No valid session");
      return NextResponse.json(
        { error: "Unauthorized access - No valid session" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log(`Theme API POST: Processing request for user ${userEmail}`);

    // Get theme preference from request body
    const body = await req.json();
    console.log(`Theme API POST: Request body:`, JSON.stringify(body, null, 2));
    const { theme } = body;

    // Validate theme value
    if (!theme || (theme !== "dark" && theme !== "light")) {
      console.log(`Theme API POST: Invalid theme value: ${theme}`);
      return NextResponse.json(
        { error: "Invalid theme value. Must be 'dark' or 'light'" },
        { status: 400 }
      );
    }

    try {
      // Find user first, then update
      const user = await users.findByEmail(userEmail);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await users.update(user.id, { theme });
      const updatedUser = await users.findById(user.id);

      console.log(
        `Theme API POST: Successfully updated theme to ${theme} for user ${userEmail}`,
        updatedUser
      );

      return NextResponse.json({
        message: "Theme preference updated successfully",
        theme: updatedUser!.theme,
      });
    } catch (dbError) {
      console.error(
        `Theme API POST: Database error for user ${userEmail}:`,
        dbError
      );
      return NextResponse.json(
        {
          error:
            "Failed to update theme in database: " +
            (dbError instanceof Error ? dbError.message : String(dbError)),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating user theme:", error);
    return NextResponse.json(
      {
        error:
          "An error occurred while updating theme preference: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
