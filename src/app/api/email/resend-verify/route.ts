import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSession } from "@/lib/firebase/auth";
import { users, verificationTokens } from "@/lib/firebase/db";
import { createHash } from "crypto";

// Initialize Resend with API key from environment variables
const resendApiKey =
  process.env.EMAIL_API_KEY || "re_f5gPZpRW_LCvhWEMno9K9DDntpc4MsTY4";
const resend = new Resend(resendApiKey);

/**
 * Generate a verification token for email verification
 * @param email The user's email
 * @returns A secure token
 */
function generateVerificationToken(email: string): string {
  // Create a hash using the email and a secret
  const secret =
    process.env.EMAIL_SECRET || "echoops-email-verification-secret";
  const timestamp = Date.now().toString();
  return createHash("sha256")
    .update(`${email}-${timestamp}-${secret}`)
    .digest("hex");
}

/**
 * POST /api/email/resend-verify - Send a verification email to the user using Resend service
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication first - only authenticated users can verify their email
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

    // Check if email is already verified
    const user = await users.findById(userId);

    if (user?.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Generate a verification token
    const token = generateVerificationToken(email);

    // Store the token in the VerificationToken model
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token valid for 60 minutes

    await verificationTokens.create({
      identifier: email,
      token,
      expires,
    });

    // Generate verification URL
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@update.echoops.org",
      to: email,
      subject: "Verify Your Email Address - EchoOps",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <p>Hi ${firstName},</p>

          <p>Thanks for signing up with EchoOps! To complete your registration and activate your account, please verify your email address by clicking the link below:</p>

          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #4A90E2; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Verify Email Address</a>
          </p>

          <p>This link will expire in 60 minutes. Once you've clicked it, you'll be fully validated and able to access all areas of your EchoOps dashboard.</p>

          <p>If you didn't create a EchoOps account, you can safely ignore this message.</p>

          <p>Welcome aboard!</p>

          <p>--- The EchoOps Team</p>
        </div>
      `,
      text: `
Hi ${firstName},

Thanks for signing up with EchoOps! To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 60 minutes. Once you've clicked it, you'll be fully validated and able to access all areas of your EchoOps dashboard.

If you didn't create a EchoOps account, you can safely ignore this message.

Welcome aboard!

--- The EchoOps Team
      `,
    });

    if (error) {
      console.error("Error sending email via Resend:", error);
      return NextResponse.json(
        {
          error: "Failed to send verification email",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
      id: data?.id,
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
