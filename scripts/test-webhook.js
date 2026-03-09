#!/usr/bin/env node
/**
 * ADO Webhook Testing Utility
 *
 * This script sends a test webhook payload to a specified URL with the proper signature.
 * It's useful for testing webhook handling locally or in production without needing to trigger
 * a real Azure DevOps event.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    "Usage: node test-webhook.js <webhook-url> <webhook-secret> <payload-file>"
  );
  console.error(
    "Example: node test-webhook.js https://echoops.org/api/ado/webhook your-secret-key ./sample-webhook-payload.json"
  );
  console.error(
    "Options: --use-url-secret: Add the secret to the URL as a query parameter instead of using it for signature generation"
  );
  process.exit(1);
}

const webhookUrl = args[0];
const webhookSecret = args[1];
const payloadFile = args[2];
const useUrlSecret = args.includes("--use-url-secret");

async function sendTestWebhook() {
  try {
    // Read the payload file
    console.log(`Reading payload from ${payloadFile}...`);
    const payload = fs.readFileSync(path.resolve(payloadFile), "utf8");

    // Create signature
    const hmacSha256 = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");
    console.log(`Generated signature: ${hmacSha256}`);

    // Parse URL
    let url = new URL(webhookUrl);

    // If using URL secret, add it to the URL
    if (useUrlSecret) {
      url.searchParams.append("secret", webhookSecret);
      console.log(
        `Added secret to URL: ${url.toString().replace(webhookSecret, "***SECRET***")}`
      );
    }

    // Try both with and without bypass parameter
    if (args.includes("--bypass")) {
      url.searchParams.append("bypass", "true");
      console.log(`Added bypass parameter to URL`);
    }

    // Prepare request options
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "x-ado-signature": hmacSha256,
      },
    };

    console.log(
      `Sending webhook to ${url.toString().replace(webhookSecret, "***SECRET***")}...`
    );
    console.log(`Headers: ${JSON.stringify(options.headers, null, 2)}`);

    // Create request
    const request = (url.protocol === "https:" ? https : http).request(
      options,
      (res) => {
        console.log(
          `\nResponse Status: ${res.statusCode} ${res.statusMessage}`
        );
        console.log(
          `Response Headers: ${JSON.stringify(res.headers, null, 2)}`
        );

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const jsonResponse = JSON.parse(data);
            console.log("\nResponse Body:");
            console.log(JSON.stringify(jsonResponse, null, 2));
          } catch (e) {
            console.log("\nResponse Body (raw):");
            console.log(data);
          }

          // Provide guidance based on the response
          if (res.statusCode === 401) {
            console.log("\n❌ Authentication failed (401 Unauthorized)");
            console.log("Suggestions:");
            console.log("1. Verify the webhook secret matches in both places");
            console.log(
              "2. Try the diagnostic endpoint: " +
                webhookUrl.replace(/webhook$/, "webhook/signature-debug")
            );
            console.log("3. Try again with: --use-url-secret --bypass");
          } else if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log("\n✅ Webhook delivered successfully!");
          } else {
            console.log(
              `\n❌ Webhook failed with status code ${res.statusCode}`
            );
          }
        });
      }
    );

    request.on("error", (error) => {
      console.error(`\nError sending webhook: ${error.message}`);
    });

    // Send the webhook
    request.write(payload);
    request.end();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Execute the function
sendTestWebhook();
