import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { sendSimpleEmail } from "@/lib/email";

/**
 * POST /api/email/send - Send an email via MailerSend (Firestore-triggered)
 *
 * Request body:
 * - to: string - Recipient email address
 * - subject: string - Email subject
 * - text: string (optional) - Plain text email body
 * - html: string (optional) - HTML email body
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { to, subject, text, html } = body;

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

    const docId = await sendSimpleEmail(to, subject, { text, html });

    return NextResponse.json({
      success: true,
      message: "Email queued for sending",
      id: docId,
    });
  } catch (error) {
    console.error("Error queuing email:", error);
    return NextResponse.json(
      {
        error: "Failed to queue email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
