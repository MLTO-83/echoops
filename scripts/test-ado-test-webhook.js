#!/usr/bin/env node
/**
 * Test ADO Test Webhook
 *
 * This script specifically tests the ADO test webhook handling by sending a payload
 * with the special ADO test ID: 27646e0e-b520-4d2b-9411-bba7524947cd
 *
 * Usage: node test-ado-test-webhook.js <webhook-url> [<webhook-secret>]
 * The secret is optional as it should be bypassed for test payloads
 */

const https = require("https");
const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

// Command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Usage: node test-ado-test-webhook.js <webhook-url> [<webhook-secret>]"
  );
  process.exit(1);
}

const webhookUrl = args[0];
const webhookSecret = args[1] || "dummy-secret";

// Create the special test payload
const testPayload = JSON.stringify({
  subscriptionId: "8e04ca2a-f1d6-4e29-afdc-d43b5e0d0ef9",
  notificationId: 21,
  id: "27646e0e-b520-4d2b-9411-bba7524947cd", // Special ADO test ID
  eventType: "workitem.updated",
  publisherId: "tfs",
  resource: {
    workItemId: 123,
    revision: {
      fields: {
        "System.TeamProject": "TestProject",
        "System.Title": "Test Work Item",
        "System.State": "New",
      },
    },
  },
});

// Create signature (even though it should be bypassed)
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(testPayload)
  .digest("hex");

// Parse URL
const url = new URL(webhookUrl);

// Prepare request options
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === "https:" ? 443 : 80),
  path: `${url.pathname}${url.search}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(testPayload),
    "x-ado-signature": signature,
  },
};

console.log(`\n🔔 Testing ADO Test Webhook\n`);
console.log(`URL: ${webhookUrl}`);
console.log(
  `Using special test payload ID: 27646e0e-b520-4d2b-9411-bba7524947cd`
);
console.log(`Signature: ${signature}`);
console.log(`\nSending request...\n`);

// Create request
const req = (url.protocol === "https:" ? https : http).request(
  options,
  (res) => {
    console.log(`Response status: ${res.statusCode} ${res.statusMessage}`);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        const parsedData = JSON.parse(data);
        console.log(`\nResponse data:`, JSON.stringify(parsedData, null, 2));

        if (res.statusCode === 200) {
          console.log(
            `\n✅ Test successful! The webhook handler properly accepted the ADO test payload.`
          );
        } else {
          console.log(`\n❌ Test failed with status code ${res.statusCode}`);
        }
      } catch (e) {
        console.log(`\nRaw response:`, data);
        console.log(`\n❌ Failed to parse response as JSON`);
      }
    });
  }
);

req.on("error", (error) => {
  console.error(`\n❌ Error sending request: ${error.message}`);
});

// Send the request
req.write(testPayload);
req.end();
