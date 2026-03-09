import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

// Initialize Resend with API key from environment variables
const resendApiKey =
  process.env.EMAIL_API_KEY || "re_f5gPZpRW_LCvhWEMno9K9DDntpc4MsTY4";
const resend = new Resend(resendApiKey);

/**
 * POST /api/email/send - Send an email using Resend service
 *
 * Request body should include:
 * - to: string - Recipient email address
 * - subject: string - Email subject
 * - text: string (optional) - Plain text email body
 * - html: string (optional) - HTML email body
 *
 * At least one of text or html must be provided
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { to, subject, text, html } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: "Recipient email address (to) is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Email subject is required" },
        { status: 400 }
      );
    }

    if (!text && !html) {
      return NextResponse.json(
        { error: "Email content (text or html) is required" },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData = {
      from: process.env.RESEND_FROM_EMAIL || "onboarding@update.portavi.eu",
      to,
      subject,
      ...(text && { text }),
      ...(html && { html }),
    };

    // Send the email using Resend
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("Error sending email via Resend:", error);
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      id: data?.id,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
