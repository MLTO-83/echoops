import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createHash } from "crypto";

// Create a reusable transporter for sending emails
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Generate a verification token for email verification
 * @param email The user's email
 * @returns A secure token
 */
function generateVerificationToken(email: string): string {
  // Create a hash using the email and a secret
  const secret =
    process.env.EMAIL_SECRET || "portavi-email-verification-secret";
  const timestamp = Date.now().toString();
  return createHash("sha256")
    .update(`${email}-${timestamp}-${secret}`)
    .digest("hex");
}

/**
 * POST /api/test/email - Test endpoint for sending verification emails
 * This is just for testing and doesn't require authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a verification token
    const token = generateVerificationToken(email);

    // Generate verification URL
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    console.log("Sending test email to:", email);
    console.log("Using EMAIL_USER:", process.env.EMAIL_USER);
    console.log("Verification URL:", verificationUrl);

    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Portavi User Validation (Test)",
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>This is a test email from Portavi. If you received this, it means the email sending functionality is working!</p>
          <p>You would normally verify your email by clicking the button below:</p>
          <a 
            href="${verificationUrl}" 
            style="background-color: #4A90E2; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; margin: 10px 0;"
          >
            Verify Email
          </a>
          <p>Test token: ${token}</p>
          <p><strong>Note:</strong> This is just a test. No verification token has been saved to the database.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Test verification email sent",
      email,
      token,
    });
  } catch (error) {
    console.error("Error sending test verification email:", error);
    return NextResponse.json(
      {
        error: "Failed to send test verification email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
