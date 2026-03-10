import { adminDb } from "./firebase/admin";

/**
 * Email service using MailerSend Firebase Extension.
 *
 * Sends emails by writing documents to the Firestore `emails` collection.
 * The MailerSend extension monitors this collection and dispatches emails
 * automatically based on document fields.
 */

const EMAIL_COLLECTION = "emails";
const DEFAULT_FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || "noreply@echoops.org";
const DEFAULT_FROM_NAME = process.env.MAILERSEND_FROM_NAME || "EchoOps";

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailOptions {
  to: EmailRecipient[];
  from?: EmailRecipient;
  subject: string;
  html?: string;
  text?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  replyTo?: EmailRecipient;
  templateId?: string;
  variables?: { email: string; substitutions: { var: string; value: string }[] }[];
  personalization?: { email: string; data: Record<string, string> }[];
  tags?: string[];
}

/**
 * Queue an email for sending via the MailerSend Firebase Extension.
 * Returns the Firestore document ID for tracking.
 */
export async function sendEmail(options: EmailOptions): Promise<string> {
  const emailDoc: Record<string, unknown> = {
    to: options.to,
    from: options.from || { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME },
    subject: options.subject,
    createdAt: new Date(),
  };

  if (options.html) emailDoc.html = options.html;
  if (options.text) emailDoc.text = options.text;
  if (options.cc) emailDoc.cc = options.cc;
  if (options.bcc) emailDoc.bcc = options.bcc;
  if (options.replyTo) emailDoc.reply_to = options.replyTo;
  if (options.templateId) emailDoc.template_id = options.templateId;
  if (options.variables) emailDoc.variables = options.variables;
  if (options.personalization) emailDoc.personalization = options.personalization;
  if (options.tags) emailDoc.tags = options.tags;

  const ref = await adminDb.collection(EMAIL_COLLECTION).add(emailDoc);
  return ref.id;
}

/**
 * Send a simple email to a single recipient.
 */
export async function sendSimpleEmail(
  to: string,
  subject: string,
  content: { html?: string; text?: string }
): Promise<string> {
  return sendEmail({
    to: [{ email: to }],
    subject,
    html: content.html,
    text: content.text,
  });
}
