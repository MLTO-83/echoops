# Azure DevOps Webhook Integration

## Overview

This document explains how the Portavi application integrates with Azure DevOps (ADO) webhooks, with special emphasis on the test webhook handling.

## ADO Test Webhook Behavior

When setting up a webhook in Azure DevOps, ADO sends a test payload to verify the endpoint is working correctly. This payload has the following characteristics:

- It has a fixed ID: `27646e0e-b520-4d2b-9411-bba7524947cd`
- It is sent as part of the webhook creation/verification process
- It requires a 2xx response (typically 200 OK) to confirm the webhook is working

## Special Handling in Portavi

Portavi implements special handling for this test webhook payload:

1. When a payload with ID `27646e0e-b520-4d2b-9411-bba7524947cd` is detected, it is automatically accepted
2. Signature validation is bypassed for this specific test payload
3. A success response is returned without further processing
4. No database operations are performed for the test payload

## Troubleshooting

If you're experiencing issues with ADO webhook integration:

1. Use the diagnostic endpoint at `/api/ado/webhook/diagnose` to verify payload format and signatures
2. Check the webhook logs for any validation or processing errors
3. Ensure your webhook secret is correctly configured both in ADO and in your Portavi project
4. If testing locally, you can use the `bypass=true` URL parameter (not available in production)

## Related Files

- `/src/app/api/ado/webhook/route.ts` - Main webhook handler
- `/src/app/api/ado/webhook/diagnose/route.ts` - Diagnostic endpoint
- `/src/app/api/ado/webhook/postman-test-setup.md` - Postman testing guide
- `/scripts/test-webhook.js` - Script for sending test webhooks

## Security Considerations

- Never expose webhook secrets in client-side code or URLs in production
- Always validate webhook signatures except for the known ADO test payload
- Monitor logs for any suspicious webhook activity
