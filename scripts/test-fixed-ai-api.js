// Test the fixed AI API endpoint on production
const https = require("https");

async function testFixedAPIEndpoint() {
  try {
    console.log("=== Testing Fixed /api/settings/test-ai endpoint ===");

    const postData = JSON.stringify({
      prompt: "What is the meaning for code review?",
    });

    const options = {
      hostname: "echoops.org",
      port: 443,
      path: "/api/settings/test-ai",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": postData.length,
        Cookie:
          "__Secure-next-auth.session-token=06ae23fd-7133-4e95-9f4a-e93d1749d9cb; __Host-next-auth.csrf-token=3ed29105641731c81cd16b75d92edfa22e53acb6ace494dfb4efbb6c365fb579%7Cfd8a1900c90a53376ec2abffc06c598a96dc6e8d18b4f9d8e934583491dd9604; __Secure-next-auth.callback-url=https%3A%2F%2Fechoops.org%2Fdashboard",
      },
    };

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log("Response body:");
        try {
          const jsonResponse = JSON.parse(data);
          console.log(JSON.stringify(jsonResponse, null, 2));

          // Check if the response is successful
          if (jsonResponse.success) {
            console.log("\n✅ AI API Test PASSED - Google Gemini is working!");
            console.log(
              "Response length:",
              jsonResponse.message?.length || 0,
              "characters"
            );
          } else {
            console.log("\n❌ AI API Test FAILED");
            console.log("Error:", jsonResponse.message || jsonResponse.error);
          }
        } catch (e) {
          console.log("Raw response (not JSON):");
          console.log(data);
          console.log("\n❌ AI API Test FAILED - Invalid JSON response");
        }
      });
    });

    req.on("error", (e) => {
      console.error(`Request error: ${e.message}`);
    });

    req.write(postData);
    req.end();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testFixedAPIEndpoint();
