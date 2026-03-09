// scripts/test-ado-authentication.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Use production path for server deployment
const prismaPath = "/var/www/portavi/prisma/app/generated/prisma/client";

const { PrismaClient } = require(prismaPath);

// Initialize Prisma client
const prisma = new PrismaClient();

async function testAdoAuthentication() {
  console.log("=== Testing Azure DevOps Authentication ===\n");

  try {
    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      console.log("❌ No ADO connection found");
      return;
    }

    console.log(`✅ ADO Connection found:`);
    console.log(`   Organization URL: ${adoConnection.adoOrganizationUrl}`);
    console.log(`   PAT exists: ${adoConnection.pat ? "Yes" : "No"}`);
    console.log(
      `   PAT length: ${adoConnection.pat ? adoConnection.pat.length : 0} characters`
    );

    if (!adoConnection.pat) {
      console.log("❌ No Personal Access Token found");
      return;
    }

    // Test different authentication approaches
    console.log("\n🔍 Testing authentication methods...\n");

    // Method 1: Basic Auth with username:token
    console.log("1. Testing Basic Auth with username:token format...");
    try {
      const basicAuthApi1 = axios.create({
        baseURL: adoConnection.adoOrganizationUrl,
        headers: {
          Authorization: `Basic ${Buffer.from(`username:${adoConnection.pat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const response1 = await basicAuthApi1.get(
        "/_apis/projects?api-version=7.0"
      );
      console.log("   ✅ SUCCESS with username:token format");
      console.log(`   Found ${response1.data?.value?.length || 0} projects`);
    } catch (error1) {
      console.log("   ❌ FAILED with username:token format");
      console.log(`   Error: ${error1.response?.status || error1.message}`);
    }

    // Method 2: Basic Auth with empty username (just :token)
    console.log(
      "\n2. Testing Basic Auth with empty username (:token format)..."
    );
    try {
      const basicAuthApi2 = axios.create({
        baseURL: adoConnection.adoOrganizationUrl,
        headers: {
          Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const response2 = await basicAuthApi2.get(
        "/_apis/projects?api-version=7.0"
      );
      console.log("   ✅ SUCCESS with :token format");
      console.log(`   Found ${response2.data?.value?.length || 0} projects`);
    } catch (error2) {
      console.log("   ❌ FAILED with :token format");
      console.log(`   Error: ${error2.response?.status || error2.message}`);
    }

    // Method 3: Bearer token
    console.log("\n3. Testing Bearer token...");
    try {
      const bearerApi = axios.create({
        baseURL: adoConnection.adoOrganizationUrl,
        headers: {
          Authorization: `Bearer ${adoConnection.pat}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const response3 = await bearerApi.get("/_apis/projects?api-version=7.0");
      console.log("   ✅ SUCCESS with Bearer token");
      console.log(`   Found ${response3.data?.value?.length || 0} projects`);
    } catch (error3) {
      console.log("   ❌ FAILED with Bearer token");
      console.log(`   Error: ${error3.response?.status || error3.message}`);
    }

    // Method 4: Test PAT validity by checking profile
    console.log("\n4. Testing PAT validity with profile endpoint...");
    try {
      const profileApi = axios.create({
        baseURL: adoConnection.adoOrganizationUrl,
        headers: {
          Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const profileResponse = await profileApi.get(
        "/_apis/profile/profiles/me?api-version=7.0"
      );
      console.log("   ✅ PAT is valid - Profile retrieved");
      console.log(`   User: ${profileResponse.data?.displayName || "Unknown"}`);
      console.log(
        `   Email: ${profileResponse.data?.emailAddress || "Unknown"}`
      );
    } catch (profileError) {
      console.log("   ❌ PAT validation failed");
      console.log(
        `   Error: ${profileError.response?.status || profileError.message}`
      );

      if (profileError.response?.status === 401) {
        console.log("   🔍 This suggests the PAT is invalid or expired");
      }
    }

    // Method 5: Test with different API version
    console.log("\n5. Testing with different API versions...");
    try {
      const versionApi = axios.create({
        baseURL: adoConnection.adoOrganizationUrl,
        headers: {
          Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const response5 = await versionApi.get("/_apis/projects?api-version=6.0");
      console.log("   ✅ SUCCESS with API version 6.0");
      console.log(`   Found ${response5.data?.value?.length || 0} projects`);
    } catch (error5) {
      console.log("   ❌ FAILED with API version 6.0");
      console.log(`   Error: ${error5.response?.status || error5.message}`);
    }

    console.log("\n=== Summary ===");
    console.log(
      "If all methods failed with 401/403 errors, the PAT needs to be regenerated."
    );
    console.log(
      "If you're getting HTML login pages instead of JSON, the PAT is definitely invalid."
    );
    console.log("\nTo fix this:");
    console.log("1. Go to https://dev.azure.com/torslev/_usersSettings/tokens");
    console.log(
      "2. Create a new Personal Access Token with 'Code (read & write)' permissions"
    );
    console.log("3. Update the token in your database");
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAdoAuthentication().catch(console.error);
