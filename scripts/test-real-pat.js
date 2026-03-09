// Simple Azure DevOps authentication test using actual database PAT
const {
  PrismaClient,
} = require("/root/portavi/prisma/app/generated/prisma/client");

async function testRealPAT() {
  const prisma = new PrismaClient();

  try {
    console.log("=== Azure DevOps PAT Test ===");

    // Get the real PAT from database
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      console.log("❌ No ADO connection found in database");
      return;
    }

    console.log("✅ ADO Connection found:");
    console.log(`   Organization: ${adoConnection.adoOrganizationUrl}`);
    console.log(`   PAT exists: ${adoConnection.pat ? "Yes" : "No"}`);
    console.log(`   PAT length: ${adoConnection.pat?.length || 0} characters`);

    if (!adoConnection.pat) {
      console.log("❌ No PAT found in database");
      return;
    }

    // Test with curl command (simpler than Node.js HTTP)
    const { spawn } = require("child_process");

    const authHeader = Buffer.from(`:${adoConnection.pat}`).toString("base64");
    const testUrl = `${adoConnection.adoOrganizationUrl}/_apis/projects?api-version=7.0`;

    console.log("\n=== Testing PAT with curl ===");
    console.log(`URL: ${testUrl}`);

    const curlProcess = spawn("curl", [
      "-s", // silent
      "-w",
      "%{http_code}", // write out HTTP status code
      "-H",
      `Authorization: Basic ${authHeader}`,
      "-H",
      "Content-Type: application/json",
      "-H",
      "Accept: application/json",
      testUrl,
    ]);

    let output = "";
    let httpCode = "";

    curlProcess.stdout.on("data", (data) => {
      const str = data.toString();
      // Extract HTTP code (last 3 digits)
      if (str.match(/^\d{3}$/)) {
        httpCode = str;
      } else {
        output += str;
      }
    });

    curlProcess.stderr.on("data", (data) => {
      console.error("curl error:", data.toString());
    });

    curlProcess.on("close", (code) => {
      console.log(`\nHTTP Status: ${httpCode || "unknown"}`);

      if (httpCode === "200") {
        console.log("✅ PAT authentication successful!");
        try {
          const jsonData = JSON.parse(output);
          if (jsonData.value && Array.isArray(jsonData.value)) {
            console.log(`Found ${jsonData.value.length} projects:`);
            jsonData.value.slice(0, 3).forEach((project) => {
              console.log(`  - ${project.name} (${project.id})`);
            });
          }
        } catch (e) {
          console.log("Response preview:", output.substring(0, 200));
        }
      } else if (httpCode === "401") {
        console.log("❌ PAT authentication failed - token expired or invalid");
      } else if (httpCode === "403") {
        console.log("❌ PAT lacks sufficient permissions");
      } else {
        console.log(`❌ Unexpected HTTP status: ${httpCode}`);
        console.log("Response preview:", output.substring(0, 500));
      }

      prisma.$disconnect();
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
  }
}

testRealPAT();
