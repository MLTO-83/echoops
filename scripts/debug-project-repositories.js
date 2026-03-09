// scripts/debug-project-repositories.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Use production path for server deployment
const prismaPath = "/var/www/portavi/prisma/app/generated/prisma/client";

const { PrismaClient } = require(prismaPath);

// Initialize Prisma client
const prisma = new PrismaClient();

async function debugProjectRepositories() {
  console.log("=== Debug Project Repositories ===\n");

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
    });

    if (!project) {
      console.log("❌ MasterData management project not found in database");
      return;
    }

    console.log(`✅ Project found in database:`);
    console.log(`   Name: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   ADO Project ID: ${project.adoProjectId}`);

    const adoProjectId = project.adoProjectId;
    if (!adoProjectId) {
      console.log("❌ No ADO Project ID found for this project");
      return;
    }

    // Test API connectivity first
    console.log("\n🔍 Testing API connectivity...");
    try {
      const testResponse = await adoApi.get("/_apis/projects?api-version=7.0");
      console.log(
        "Raw API response:",
        JSON.stringify(testResponse.data, null, 2)
      );

      if (
        testResponse.data &&
        testResponse.data.value &&
        Array.isArray(testResponse.data.value)
      ) {
        console.log(
          `✅ API connectivity OK - Found ${testResponse.data.value.length} projects`
        );
      } else {
        console.log("⚠️ API responded but data structure is unexpected");
        console.log("Response data:", testResponse.data);
      }
    } catch (error) {
      console.log(`❌ API connectivity failed: ${error.message}`);
      if (error.response) {
        console.log(`HTTP Status: ${error.response.status}`);
        console.log(`Response data:`, error.response.data);
      }
      return;
    }

    // Get all repositories in the specific project
    console.log(`\n🔍 Getting repositories for project ${adoProjectId}...`);

    try {
      const repositoriesResponse = await adoApi.get(
        `/${encodeURIComponent(adoProjectId)}/_apis/git/repositories?api-version=7.0`
      );

      if (!repositoriesResponse.data?.value) {
        console.log("❌ No repositories data in response");
        console.log(
          "Response structure:",
          JSON.stringify(repositoriesResponse.data, null, 2)
        );
        return;
      }

      const repositories = repositoriesResponse.data.value;
      console.log(`✅ Found ${repositories.length} repositories in project:`);

      if (repositories.length === 0) {
        console.log("   No repositories found in this project");

        // Try to get project details to verify it exists
        console.log("\n🔍 Verifying project exists...");
        try {
          const projectResponse = await adoApi.get(
            `/_apis/projects/${encodeURIComponent(adoProjectId)}?api-version=7.0`
          );
          console.log(`✅ Project verified: ${projectResponse.data.name}`);
          console.log(`   State: ${projectResponse.data.state}`);
          console.log(`   Visibility: ${projectResponse.data.visibility}`);
        } catch (projectError) {
          console.log(
            `❌ Project verification failed: ${projectError.message}`
          );
        }
      } else {
        repositories.forEach((repo, index) => {
          console.log(`   ${index + 1}. "${repo.name}"`);
          console.log(`      ID: ${repo.id}`);
          console.log(
            `      Default Branch: ${repo.defaultBranch || "Not set"}`
          );
          console.log(`      Size: ${repo.size || 0} bytes`);
          console.log(`      Project: ${repo.project?.name || "Unknown"}`);
          console.log("");
        });

        // Look for "MasterData management" specifically
        const targetRepo = repositories.find(
          (repo) =>
            repo.name === "MasterData management" ||
            repo.name.toLowerCase().includes("masterdata") ||
            repo.name.toLowerCase().includes("master data")
        );

        if (targetRepo) {
          console.log(`🎯 Found potential match: "${targetRepo.name}"`);
        } else {
          console.log(
            `⚠️  No repository matching "MasterData management" found`
          );
          console.log(
            `   Consider using one of the available repositories above`
          );
        }
      }
    } catch (error) {
      console.log(`❌ Failed to get repositories: ${error.message}`);
      if (error.response) {
        console.log(`   HTTP Status: ${error.response.status}`);
        console.log(`   Response:`, error.response.data);
      }
    }

    // Also check all projects to make sure we're in the right one
    console.log("\n🔍 Listing all accessible projects for reference...");
    try {
      const allProjectsResponse = await adoApi.get(
        "/_apis/projects?api-version=7.0"
      );

      if (
        allProjectsResponse.data &&
        allProjectsResponse.data.value &&
        Array.isArray(allProjectsResponse.data.value)
      ) {
        const allProjects = allProjectsResponse.data.value;
        console.log(`✅ Found ${allProjects.length} accessible projects:`);
        allProjects.forEach((proj, index) => {
          const isTarget = proj.id === adoProjectId;
          const marker = isTarget ? " 🎯" : "";
          console.log(`   ${index + 1}. "${proj.name}" (${proj.id})${marker}`);
        });
      } else {
        console.log("⚠️ Projects response has unexpected structure");
        console.log(
          "Response:",
          JSON.stringify(allProjectsResponse.data, null, 2)
        );
      }
    } catch (error) {
      console.log(`❌ Failed to list projects: ${error.message}`);
      if (error.response) {
        console.log(`HTTP Status: ${error.response.status}`);
        console.log(`Response data:`, error.response.data);
      }
    }
  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugProjectRepositories().catch(console.error);
