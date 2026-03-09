// scripts/debug-ado-repositories.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Dynamic path detection to handle both dev and production environments
const basePath = fs.existsSync("/var/www/portavi")
  ? "/var/www/portavi"
  : "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

const { PrismaClient } = require(prismaPath);

// Initialize Prisma client
const prisma = new PrismaClient();

async function debugADORepositories() {
  console.log("=== Debug ADO Repositories ===\n");

  try {
    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      console.log("❌ No ADO connection found");
      return;
    }

    console.log(`✅ ADO Connection found:`);
    console.log(`   Organization URL: ${adoConnection.adoOrganizationUrl}`);

    const adoApi = axios.create({
      baseURL: adoConnection.adoOrganizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    // Get the MasterData management project info
    const project = await prisma.project.findFirst({
      where: { name: "MasterData management" },
      include: {
        webhookConfig: true,
      },
    });

    if (!project) {
      console.log("❌ MasterData management project not found in database");
      return;
    }

    console.log(`\n✅ Project found in database:`);
    console.log(`   Name: "${project.name}"`);
    console.log(`   ID: ${project.id}`);
    console.log(
      `   Webhook Repository: "${project.webhookConfig?.repositoryName || "Not set"}"`
    );

    // Try to list all projects in ADO
    console.log(`\n🔍 Listing all projects in ADO organization...`);
    try {
      const projectsResponse = await adoApi.get(
        "/_apis/projects?api-version=7.0"
      );
      console.log(`Found ${projectsResponse.data.count} projects:`);

      for (const adoProject of projectsResponse.data.value) {
        console.log(`   - "${adoProject.name}" (ID: ${adoProject.id})`);

        // If this matches our project name, list its repositories
        if (
          adoProject.name === "MasterData management" ||
          adoProject.name.includes("MasterData")
        ) {
          console.log(`\n📁 Repositories in project "${adoProject.name}":`);

          try {
            const reposResponse = await adoApi.get(
              `/${encodeURIComponent(adoProject.name)}/_apis/git/repositories?api-version=7.0`
            );

            if (
              reposResponse.data.value &&
              reposResponse.data.value.length > 0
            ) {
              for (const repo of reposResponse.data.value) {
                console.log(`     - "${repo.name}" (ID: ${repo.id})`);
                console.log(`       URL: ${repo.webUrl}`);
                console.log(
                  `       Default Branch: ${repo.defaultBranch || "Not set"}`
                );
              }
            } else {
              console.log(`     No repositories found in this project`);
            }
          } catch (repoError) {
            console.log(
              `     ❌ Error listing repositories: ${repoError.message}`
            );
          }
        }
      }
    } catch (projectError) {
      console.log(`❌ Error listing projects: ${projectError.message}`);
    }

    // Also try direct repository access with different encodings
    console.log(
      `\n🔍 Testing direct repository access with different encodings...`
    );

    const testNames = [
      "MasterData management",
      "MasterData%20management",
      "MasterData+management",
      "masterdata-management",
      "MasterData-management",
    ];

    for (const testName of testNames) {
      try {
        const repoResponse = await adoApi.get(
          `/MasterData%20management/_apis/git/repositories/${encodeURIComponent(testName)}?api-version=7.0`
        );
        console.log(`   ✅ Found repository with name: "${testName}"`);
        console.log(`      Actual name: "${repoResponse.data.name}"`);
        console.log(`      ID: ${repoResponse.data.id}`);
      } catch (error) {
        console.log(`   ❌ Repository not found with name: "${testName}"`);
      }
    }
  } catch (error) {
    console.error("Error debugging ADO repositories:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugADORepositories().catch(console.error);
