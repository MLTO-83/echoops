import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, verificationTokens } from "@/lib/firebase/db";
import { sendEmail } from "@/lib/email";
import { createHash } from "crypto";

function generateVerificationToken(email: string): string {
  const secret = process.env.EMAIL_SECRET;
  if (!secret) {
    throw new Error("EMAIL_SECRET environment variable is required");
  }
  const timestamp = Date.now().toString();
  return createHash("sha256")
    .update(`${email}-${timestamp}-${secret}`)
    .digest("hex");
}

/**
 * POST /api/email/send-verification - Send a verification email to the current user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const userId = session.user.id;
    const firstName = session.user.name?.split(" ")[0] || email.split("@")[0];

    const user = await users.findById(userId);
    if (user?.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Invalidate any existing tokens for this email
    const existingToken = await verificationTokens.findByIdentifier?.(email);
    if (existingToken) {
      await verificationTokens.deleteByToken(existingToken.token);
    }

    const token = generateVerificationToken(email);

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await verificationTokens.create({
      identifier: email,
      token,
      expires,
    });

    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    const docId = await sendEmail({
      to: [{ email, name: firstName }],
      subject: "Verify Your Email Address - EchoOps",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Hi ${firstName},</p>

          <p>Thanks for signing up with EchoOps! To complete your registration and activate your account, please verify your email address by clicking the link below:</p>

          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Verify Email Address</a>
          </p>

          <p>This link will expire in 60 minutes. Once you've clicked it, you'll be fully validated and able to access all areas of your EchoOps dashboard.</p>

          <p>If you didn't create an EchoOps account, you can safely ignore this message.</p>

          <p>Welcome aboard!</p>

          <p>--- The EchoOps Team</p>
        </div>
      `,
      text: `Hi ${firstName},

Thanks for signing up with EchoOps! To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 60 minutes. Once you've clicked it, you'll be fully validated and able to access all areas of your EchoOps dashboard.

If you didn't create an EchoOps account, you can safely ignore this message.

Welcome aboard!

--- The EchoOps Team`,
    });

    return NextResponse.json({
      success: true,
      message: "Verification email queued",
      id: docId,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    return NextResponse.json(
      {
        error: "Failed to send verification email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
