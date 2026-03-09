#!/usr/bin/env node
/**
 * Test Azure DevOps webhook signature validation
 * This script helps diagnose signature validation issues by testing different hashing algorithms
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Get parameters from command line
const args = process.argv.slice(2);

// Expected format: node test-ado-signature.js <secret> <webhookPayloadFile> [<receivedSignature>]
if (args.length < 2) {
  console.error(
    "Usage: node test-ado-signature.js <secret> <webhookPayloadFile> [<receivedSignature>]"
  );
  console.error(
    'Example: node test-ado-signature.js "your-webhook-secret" ./webhook-payload.json "sha256=abc123def456"'
  );
  process.exit(1);
}

const secret = args[0];
const payloadFile = args[1];
const receivedSignature = args.length > 2 ? args[2] : null;

console.log("ADO Webhook Signature Test");
console.log("=======================");
console.log(`Secret: ${secret.slice(0, 3)}${"*".repeat(5)}${secret.slice(-3)}`);
console.log(`Payload file: ${payloadFile}`);
console.log(`Provided signature: ${receivedSignature || "None provided"}`);
console.log("");

// Read the payload file
try {
  const payload = fs.readFileSync(path.resolve(payloadFile), "utf8");

  // Calculate signatures using different algorithms
  const hmacSha1 = crypto
    .createHmac("sha1", secret)
    .update(payload)
    .digest("hex");
  const hmacSha256 = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  console.log("Calculated signatures:");
  console.log(`SHA1:   ${hmacSha1}`);
  console.log(`SHA256: ${hmacSha256}`);
  console.log(`SHA256 with prefix: sha256=${hmacSha256}`);

  // If a signature was provided, check if it matches
  if (receivedSignature) {
    const cleanSignature = receivedSignature
      .replace(/[^a-fA-F0-9]/g, "")
      .toLowerCase();

    console.log("\nSignature validation results:");

    const matchesSha1 = cleanSignature === hmacSha1.toLowerCase();
    const matchesSha256 = cleanSignature === hmacSha256.toLowerCase();

    console.log(`Matches SHA1: ${matchesSha1 ? "YES ✅" : "NO ❌"}`);
    console.log(`Matches SHA256: ${matchesSha256 ? "YES ✅" : "NO ❌"}`);

    // Try with prefix if applicable
    if (receivedSignature.startsWith("sha256=")) {
      const withoutPrefix = receivedSignature
        .substring(7)
        .toLowerCase()
        .replace(/[^a-f0-9]/g, "");
      const matchesSha256WithoutPrefix =
        withoutPrefix === hmacSha256.toLowerCase();
      console.log(
        `Matches SHA256 after removing prefix: ${matchesSha256WithoutPrefix ? "YES ✅" : "NO ❌"}`
      );
    }

    // Try base64 decoding
    try {
      const signatureBuffer = Buffer.from(receivedSignature, "base64");
      const signatureHex = signatureBuffer.toString("hex").toLowerCase();
      const matchesBase64Sha1 = signatureHex === hmacSha1.toLowerCase();
      const matchesBase64Sha256 = signatureHex === hmacSha256.toLowerCase();

      if (matchesBase64Sha1 || matchesBase64Sha256) {
        console.log(
          `Matches Base64-decoded signature: YES ✅ (${matchesBase64Sha1 ? "SHA1" : "SHA256"})`
        );
      } else {
        console.log("Matches Base64-decoded signature: NO ❌");
      }
    } catch (err) {
      console.log("Base64 decoding attempt failed");
    }
  }

  console.log("\nHeaders to use in Postman/curl:");
  console.log(`x-ado-signature: ${hmacSha256}`);
  console.log("");
  console.log("Example curl command:");
  console.log(`curl -X POST https://portavi.eu/api/ado/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-ado-signature: ${hmacSha256}" \\
  -d @${payloadFile}`);

  console.log("\nAdjusted webhook URLs for setting in Azure DevOps:");
  console.log(
    `Main webhook: https://portavi.eu/api/ado/webhook?secret=${encodeURIComponent(secret)}`
  );
  console.log(
    `Debug webhook: https://portavi.eu/api/ado/webhook/signature-debug?secret=${encodeURIComponent(secret)}`
  );
} catch (error) {
  console.error(`Error reading or processing file: ${error.message}`);
  process.exit(1);
}
