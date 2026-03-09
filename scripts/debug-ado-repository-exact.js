// scripts/debug-ado-repository-exact.js
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
  console.log("=== ADO Repository Debug - Exact Match ===\n");

  try {
    // Get ADO connection details
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      console.log("❌ No ADO connection found");
      return;
    }

    console.log(`✅ ADO Connection found: ${adoConnection.adoOrganizationUrl}`);

    const adoApi = axios.create({
      baseURL: adoConnection.adoOrganizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    // Target specific project and repository
    const targetProjectName = "MasterData management";
    const targetRepoName = "MasterData management";

    console.log(`🎯 Target Project: "${targetProjectName}"`);
    console.log(`🎯 Target Repository: "${targetRepoName}"`);
    console.log("");

    // Step 1: List all projects
    console.log("📋 Step 1: Listing all projects...");
    try {
      const projectsResponse = await adoApi.get(
        `/_apis/projects?api-version=7.0`
      );

      console.log("Debug - Full response structure:");
      console.log("Status:", projectsResponse.status);
      console.log("Data structure:", typeof projectsResponse.data);
      console.log("Data keys:", Object.keys(projectsResponse.data || {}));

      if (projectsResponse.data && projectsResponse.data.value) {
        console.log(`Found ${projectsResponse.data.value.length} projects:`);

        for (const project of projectsResponse.data.value) {
          console.log(`  - "${project.name}" (ID: ${project.id})`);
          if (project.name === targetProjectName) {
            console.log(`    ✅ EXACT MATCH for target project!`);
          }
        }
      } else {
        console.log("❌ Unexpected response structure:");
        console.log(JSON.stringify(projectsResponse.data, null, 2));
      }
      console.log("");
    } catch (error) {
      console.log(`❌ Failed to list projects: ${error.message}`);
      if (error.response) {
        console.log(`HTTP Status: ${error.response.status}`);
        console.log(`Response data:`, error.response.data);
      }
      console.log("");
      return;
    }

    // Step 2: List repositories in target project
    console.log(
      `📋 Step 2: Listing repositories in project "${targetProjectName}"...`
    );

    // Try different encoding variations
    const encodingVariations = [
      targetProjectName, // No encoding
      encodeURIComponent(targetProjectName), // Full URI encoding
      targetProjectName.replace(/ /g, "%20"), // Manual space encoding
      targetProjectName.replace(/ /g, "_"), // Underscore replacement
      targetProjectName.replace(/ /g, "-"), // Dash replacement
      targetProjectName.replace(/ /g, ""), // No spaces
    ];

    for (const encodedProject of encodingVariations) {
      console.log(`\n🔍 Trying project encoding: "${encodedProject}"`);

      try {
        const reposResponse = await adoApi.get(
          `/${encodedProject}/_apis/git/repositories?api-version=7.0`
        );

        console.log(
          `✅ Success! Found ${reposResponse.data.count} repositories:`
        );

        for (const repo of reposResponse.data.value) {
          console.log(`  - Repository: "${repo.name}" (ID: ${repo.id})`);
          console.log(`    URL: ${repo.webUrl}`);
          console.log(`    Clone URL: ${repo.remoteUrl}`);

          if (repo.name === targetRepoName) {
            console.log(`    ✅ EXACT MATCH for target repository!`);
          }

          // Check similarity
          if (
            repo.name.toLowerCase().includes("masterdata") ||
            repo.name.toLowerCase().includes("master") ||
            repo.name.toLowerCase().includes("data")
          ) {
            console.log(`    🔍 Similar to target repository`);
          }
          console.log("");
        }

        // If we found repositories, we can stop trying other encodings
        break;
      } catch (error) {
        console.log(
          `❌ Failed with encoding "${encodedProject}": ${error.response?.status} ${error.response?.statusText || error.message}`
        );

        if (error.response?.status === 404) {
          console.log(`   (Project not found with this encoding)`);
        } else if (error.response?.status === 403) {
          console.log(`   (Access denied - check permissions)`);
        }
      }
    }

    // Step 3: Try direct repository access
    console.log(`\n📋 Step 3: Testing direct repository access...`);

    for (const encodedProject of encodingVariations.slice(0, 3)) {
      // Try top 3 encodings
      for (const encodedRepo of encodingVariations.slice(0, 3)) {
        console.log(
          `\n🔍 Testing: Project="${encodedProject}" Repository="${encodedRepo}"`
        );

        try {
          const directRepoResponse = await adoApi.get(
            `/${encodedProject}/_apis/git/repositories/${encodedRepo}?api-version=7.0`
          );

          console.log(`✅ SUCCESS! Repository found:`);
          console.log(`   Name: "${directRepoResponse.data.name}"`);
          console.log(`   ID: ${directRepoResponse.data.id}`);
          console.log(`   URL: ${directRepoResponse.data.webUrl}`);
          console.log(`   Clone URL: ${directRepoResponse.data.remoteUrl}`);

          // Test getting refs
          try {
            const refsResponse = await adoApi.get(
              `/${encodedProject}/_apis/git/repositories/${encodedRepo}/refs?filter=heads&api-version=7.0`
            );
            console.log(`   Branches: ${refsResponse.data.count} found`);

            for (const ref of refsResponse.data.value || []) {
              console.log(`     - ${ref.name} (${ref.objectId})`);
            }
          } catch (refError) {
            console.log(`   ⚠️  Could not get branches: ${refError.message}`);
          }

          return; // Success - we found the repository
        } catch (error) {
          console.log(
            `❌ Failed: ${error.response?.status} ${error.response?.statusText || error.message}`
          );
        }
      }
    }

    console.log(
      `\n❌ Could not find repository "${targetRepoName}" in project "${targetProjectName}"`
    );
    console.log(`Please verify:`);
    console.log(`1. The project name is exactly: "${targetProjectName}"`);
    console.log(`2. The repository name is exactly: "${targetRepoName}"`);
    console.log(`3. You have access to the repository`);
    console.log(`4. The personal access token has appropriate permissions`);
  } catch (error) {
    console.error("Debug failed:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugADORepositories().catch(console.error);
