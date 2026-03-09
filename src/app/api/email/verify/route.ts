import { NextRequest, NextResponse } from "next/server";
import { users, verificationTokens } from "@/lib/firebase/db";

/**
 * GET /api/email/verify - Verifies a user's email using token
 */
export async function GET(req: NextRequest) {
  try {
    // Get the token from the URL query parameters
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Find the verification token in the database
    const verificationToken = await verificationTokens.findByToken(token);

    // Check if token exists and is not expired
    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(verificationToken.expires)) {
      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: 400 }
      );
    }

    // Find the user by email and update their emailVerified timestamp
    const user = await users.findByEmail(verificationToken.identifier);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's emailVerified field with the current timestamp
    await users.update(user.id, { emailVerified: new Date() });

    // Delete the used verification token
    await verificationTokens.deleteByToken(token);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      {
        error: "Failed to verify email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
