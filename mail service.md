MailerSend - Email Service

Provider: MailerSend Firebase Extension
API Key: Stored in Google Cloud Secret Manager (`projects/83155172875/secrets/mailersend-email-MAILERSEND_API_KEY`)

## How It Works

The MailerSend Firebase Extension monitors the `emails` Firestore collection.
When a document is added, the extension reads its fields and sends the email via MailerSend.

No direct API calls are made from application code. The app simply writes a document to Firestore.

## Setup

### 1. Install the Firebase Extension

Console: Install from the Firebase Extensions hub.

CLI:
```
firebase ext:install mailersend/mailersend-email --project=echoops-65d4b
```

### 2. Configure MailerSend Dashboard

- Add and verify your sending domain (edit DNS records)
- Create an API token with full access
- Store the API token in Google Cloud Secret Manager (the Firebase extension does this automatically during install)

### 3. Environment Variables

| Variable | Description |
|---|---|
| `MAILERSEND_SECRET_NAME` | Secret Manager resource name (default: `projects/83155172875/secrets/mailersend-email-MAILERSEND_API_KEY`) |
| `MAILERSEND_FROM_EMAIL` | Default sender email (default: `noreply@echoops.org`) |
| `MAILERSEND_FROM_NAME` | Default sender name (default: `EchoOps`) |

The MailerSend API key is fetched from Google Cloud Secret Manager at runtime (cached for 5 minutes). It is also used as the secret for generating email verification tokens. No API keys are stored in `.env.local` or source code.

## Firestore Document Schema

Adding a document to the `emails` collection triggers the extension:

```js
admin.firestore().collection('emails').add({
    to: [
      { email: 'recipient@example.com', name: 'Recipient name' }
    ],
    from: {
      email: 'noreply@echoops.org',
      name: 'EchoOps'
    },
    subject: 'Hello from EchoOps!',
    html: '<p>HTML email body</p>',
    text: 'Plain text email body',
    // Optional fields:
    cc: [{ email: 'cc@example.com', name: 'CC name' }],
    bcc: [{ email: 'bcc@example.com', name: 'BCC name' }],
    template_id: 'abc123ced',
    variables: [
      {
        email: 'recipient@example.com',
        substitutions: [
          { var: 'variable_name', value: 'variable value' }
        ]
      }
    ],
    personalization: [
      {
        email: 'recipient@example.com',
        data: { personalization_name: 'personalization value' }
      }
    ],
    tags: ['tag1', 'tag2'],
    reply_to: { email: 'reply@example.com', name: 'Reply name' },
    send_at: '123465789'
})
```

## Application Architecture

### Shared Email Library

`src/lib/email.ts` — Provides `sendEmail()` and `sendSimpleEmail()` helpers that write to the `emails` Firestore collection. All email routes use this library.

### API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/email/send` | POST | Yes | Send a generic email (to, subject, html/text) |
| `/api/email/send-verification` | POST | Yes | Send verification email to current user |
| `/api/email/verify` | GET | No | Verify email token from URL |

### Frontend

- `EmailVerificationBanner` — Banner shown when email is unverified, calls `/api/email/send-verification`
- `/auth/verify-email` — Handles verification link clicks, calls `/api/email/verify`
- `/test-email` — Admin test page for sending verification and custom emails

## Migration Log

**Migrated from Resend + Nodemailer to MailerSend Firebase Extension (2026-03-10)**

Changes made:
- Created `src/lib/email.ts` — shared email service writing to Firestore `emails` collection
- Rewrote `/api/email/send` — replaced Resend SDK with Firestore write
- Rewrote `/api/email/send-verification` — replaced Resend SDK with Firestore write, added old-token cleanup
- Deleted `/api/email/resend-verify` — was a 100% duplicate of send-verification
- Deleted `/api/test/email` — unauthenticated endpoint using nodemailer (security risk)
- Updated `/test-email` page — uses send-verification route, fixed XSS in custom email form
- Added `verificationTokens.findByIdentifier()` to `src/lib/firebase/db.ts`
- Removed `resend`, `nodemailer`, and `@types/nodemailer` npm packages
- Removed hardcoded Resend API key fallback (was leaked in source)
- Removed hardcoded EMAIL_SECRET fallback — now required as env var

**Integrated Google Cloud Secret Manager (2026-03-10)**

Changes made:
- Created `src/lib/secrets.ts` — Secret Manager client with 5-minute cache
- Updated `/api/email/send-verification` — fetches MailerSend API key from Secret Manager for token generation
- Installed `@google-cloud/secret-manager` package
- Removed `mailsender_api` and `EMAIL_SECRET` from `.env.local` — all secrets now in Secret Manager
- Secret path: `projects/83155172875/secrets/mailersend-email-MAILERSEND_API_KEY`
