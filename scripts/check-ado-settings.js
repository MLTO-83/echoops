#!/usr/bin/env node

// Import Prisma client from the correct location
const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function checkAdoSettings() {
  console.log("Checking ADO Connection settings in database...");

  try {
    // Check ADO Connection
    const adoConnection = await prisma.aDOConnection.findFirst();

    if (adoConnection) {
      console.log("\n✅ ADO Connection found:");
      console.log({
        id: adoConnection.id,
        url: adoConnection.adoOrganizationUrl,
        patConfigured: !!adoConnection.pat,
        organizationId: adoConnection.organizationId,
      });

      // Check the organization
      const organization = await prisma.organization.findUnique({
        where: { id: adoConnection.organizationId },
        include: { users: true },
      });

      if (organization) {
        console.log("\n✅ Organization found:");
        console.log({
          id: organization.id,
          name: organization.name,
          userCount: organization.users.length,
        });
      } else {
        console.log("\n❌ Organization not found for ADO connection!");
      }

      // Check if there are any projects in the database
      // Projects are linked to the ADO connection, not directly to organization
      const projectCount = await prisma.project.count({
        where: { adoConnectionId: adoConnection.id },
      });

      console.log(
        `\n${projectCount > 0 ? "✅" : "❌"} Project count in database: ${projectCount}`
      );

      // List a few projects if they exist
      if (projectCount > 0) {
        const projects = await prisma.project.findMany({
          where: { adoConnectionId: adoConnection.id },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        console.log("\nLatest projects:");
        projects.forEach((project) => {
          console.log(
            `- ${project.name} (ID: ${project.id}, ADO Project ID: ${project.adoProjectId || "Not set"})`
          );
        });
      }

      // Check if we can connect to ADO
      const url = adoConnection.adoOrganizationUrl;
      const formattedUrl = url.startsWith("https://") ? url : `https://${url}`;
      const pat = adoConnection.pat;

      console.log("\nTrying to connect to Azure DevOps API...");
      try {
        const https = require("https");
        const options = {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
          },
        };

        console.log(
          `Connecting to: ${formattedUrl}/_apis/projects?$top=1&api-version=6.0`
        );

        const req = https.get(
          `${formattedUrl}/_apis/projects?$top=1&api-version=6.0`,
          options,
          (res) => {
            console.log(
              `\nADO API Response Status: ${res.statusCode} ${res.statusMessage}`
            );

            if (res.statusCode === 200) {
              console.log("✅ Successfully connected to Azure DevOps!");
              let data = "";
              res.on("data", (chunk) => {
                data += chunk;
              });

              res.on("end", () => {
                try {
                  const parsed = JSON.parse(data);
                  console.log(`Projects found in ADO: ${parsed.count || 0}`);

                  // Check the verify-ado endpoint
                  console.log("\nTesting the verify-ado endpoint...");
                  const http = require("http");
                  const testData = JSON.stringify({
                    adoOrganizationUrl: adoConnection.adoOrganizationUrl,
                    pat: adoConnection.pat,
                  });

                  const verifyReq = http.request(
                    {
                      hostname: "localhost",
                      port: process.env.PORT || 3000,
                      path: "/api/settings/verify-ado",
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Content-Length": testData.length,
                      },
                    },
                    (verifyRes) => {
                      console.log(
                        `Verify-ADO endpoint response: ${verifyRes.statusCode} ${verifyRes.statusMessage}`
                      );
                      let responseData = "";

                      verifyRes.on("data", (chunk) => {
                        responseData += chunk;
                      });

                      verifyRes.on("end", () => {
                        try {
                          const responseJson = JSON.parse(responseData);
                          console.log(
                            "Verify-ADO endpoint response data:",
                            responseJson
                          );
                        } catch (e) {
                          console.log("Raw response:", responseData);
                        }
                      });
                    }
                  );

                  verifyReq.on("error", (e) => {
                    console.log(
                      "❌ Failed to test verify-ado endpoint:",
                      e.message
                    );
                  });

                  verifyReq.write(testData);
                  verifyReq.end();
                } catch (e) {
                  console.log("Error parsing response:", e.message);
                }
              });
            } else {
              console.log("❌ Failed to connect to Azure DevOps API");
              console.log("Headers:", res.headers);

              res.on("data", (chunk) => {
                console.log("Response body:", chunk.toString());
              });
            }
          }
        );

        req.on("error", (e) => {
          console.log("❌ Connection error:", e.message);
        });

        req.end();
      } catch (error) {
        console.log("❌ Error testing ADO connection:", error.message);
      }
    } else {
      console.log("❌ No ADO Connection found in database");
    }
  } catch (error) {
    console.error("Error checking ADO settings:", error);
  } finally {
    // Wait a bit for the HTTP request to complete before disconnecting
    setTimeout(() => {
      prisma.$disconnect();
    }, 8000);
  }
}

checkAdoSettings();
