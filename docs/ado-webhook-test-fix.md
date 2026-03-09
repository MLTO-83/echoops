# ADO Webhook Integration Fix

## Problem Description

Azure DevOps (ADO) sends a test payload when setting up a webhook subscription. This test payload has a specific ID (`27646e0e-b520-4d2b-9411-bba7524947cd`) and needs to be automatically accepted without the usual signature validation to successfully complete the webhook setup process.

## Changes Made

1. **Added special case handling** in the webhook endpoint for test payloads with ID `27646e0e-b520-4d2b-9411-bba7524947cd`
2. **Enhanced the signature validation function** to support multiple formats and to bypass validation for the test payload
3. **Updated the diagnostic endpoint** to detect and report on test payloads
4. **Added documentation** on ADO webhook test payload handling
5. **Created test scripts** to verify the fix

## Affected Files

- `/src/app/api/ado/webhook/route.ts` - Updated to handle test payloads
- `/src/app/api/ado/webhook/diagnose/route.ts` - Enhanced to detect test payloads
- `/root/portavi/README.md` - Updated with information about test payloads
- `/docs/ado-webhook-integration.md` - Added new documentation
- `/scripts/test-ado-test-webhook.js` - Created new test script

## Testing the Fix

You can test the fix using the provided test scripts:

1. **Test with the special test payload ID**:

```bash
node scripts/test-ado-test-webhook.js https://your-portavi-instance.com/api/ado/webhook
```

2. **Test with the diagnostic endpoint**:

```bash
node scripts/test-ado-test-webhook.js https://your-portavi-instance.com/api/ado/webhook/diagnose
```

3. **Test with a regular payload**:

```bash
node scripts/test-webhook.js https://your-portavi-instance.com/api/ado/webhook your-webhook-secret scripts/ado-test-payload.json
```

## Expected Behavior

- When ADO sends a test payload with ID `27646e0e-b520-4d2b-9411-bba7524947cd`, the webhook should return a 200 OK response regardless of the signature
- Normal webhooks should still be validated using the signature
- The diagnostic endpoint should correctly identify and report test payloads
