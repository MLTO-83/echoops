// PAT validation test
const axios = require("axios");

const CONFIG = {
  pat: "1oOPk3KVFkhHSGcVBT7kJs2KBkyTdtNdeGs1nycwv2oFqNBYBqueLJQQJ99BEACAAAAAAAAAAAAASAZDODneY",
  organizationUrl: "https://dev.azure.com/torslev/",
};

async function testPAT() {
  console.log("Testing PAT authentication...");
  console.log(`PAT length: ${CONFIG.pat.length}`);
  console.log(`Organization: ${CONFIG.organizationUrl}`);

  // Create the authorization header
  const authHeader = `Basic ${Buffer.from(`:${CONFIG.pat}`).toString("base64")}`;
  console.log(`Auth header length: ${authHeader.length}`);

  try {
    console.log("\n=== Making request to Azure DevOps API ===");
    const response = await axios.get(
      `${CONFIG.organizationUrl}/_apis/projects?api-version=7.0`,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status < 500; // Accept any status below 500 to see what's happening
        },
      }
    );

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);

    if (response.status === 200) {
      console.log("✅ PAT is valid!");
      if (response.data && response.data.value) {
        console.log(`Found ${response.data.value.length} projects`);
      }
    } else if (response.status === 401) {
      console.log(
        "❌ PAT authentication failed - token may be expired or invalid"
      );
    } else if (response.status === 403) {
      console.log("❌ PAT lacks sufficient permissions");
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      console.log("Response data preview:", response.data.substring(0, 500));
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Headers:`, error.response.headers);
      if (typeof error.response.data === "string") {
        console.error(
          "Response preview:",
          error.response.data.substring(0, 500)
        );
      } else {
        console.error("Response data:", error.response.data);
      }
    }
  }
}

testPAT();
