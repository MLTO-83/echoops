// Focused branch creation test to identify the 400 error cause
const axios = require("axios");

// Test configuration
const TEST_CONFIG = {
  pat: "1oOPk3KVFkhHSGcVBT7kJs2KBkyTdtNdeGs1nycwv2oFqNBYBqueLJQQJ99BEACAAAAAAAAAAAAASAZDODneY",
  organizationUrl: "https://dev.azure.com/torslev/",
  projectName: "MasterData management",
  repositoryName: "MasterData management",
  workItemId: "53",
};

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

async function identifyBranchCreationIssue() {
  try {
    log("=== Branch Creation 400 Error Analysis ===");

    // Setup axios with detailed logging
    const adoApi = axios.create({
      baseURL: TEST_CONFIG.organizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${TEST_CONFIG.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // Add request/response interceptors for debugging
    adoApi.interceptors.request.use((request) => {
      log(`REQUEST: ${request.method?.toUpperCase()} ${request.url}`);
      log(`Headers: ${JSON.stringify(request.headers)}`);
      if (request.data) {
        log(`Body: ${JSON.stringify(request.data)}`);
      }
      return request;
    });

    adoApi.interceptors.response.use(
      (response) => {
        log(`RESPONSE: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        if (error.response) {
          log(
            `ERROR RESPONSE: ${error.response.status} ${error.response.statusText}`,
            "ERROR"
          );
          log(`Error data: ${JSON.stringify(error.response.data)}`, "ERROR");
        } else {
          log(`ERROR: ${error.message}`, "ERROR");
        }
        throw error;
      }
    );

    // Step 1: Get project info
    log("Step 1: Getting project info...");
    const projectsResponse = await adoApi.get(
      "/_apis/projects?api-version=7.0"
    );
    const project = projectsResponse.data.value.find(
      (p) => p.name.toLowerCase() === TEST_CONFIG.projectName.toLowerCase()
    );

    if (!project) {
      throw new Error(`Project '${TEST_CONFIG.projectName}' not found`);
    }
    log(`✅ Project found: ${project.name} (ID: ${project.id})`);

    // Step 2: Get repository info
    log("Step 2: Getting repository info...");
    const repositoriesResponse = await adoApi.get(
      `/${encodeURIComponent(project.id)}/_apis/git/repositories?api-version=7.0`
    );

    const repository = repositoriesResponse.data.value.find(
      (repo) => repo.name === TEST_CONFIG.repositoryName
    );
    if (!repository) {
      throw new Error(`Repository '${TEST_CONFIG.repositoryName}' not found`);
    }
    log(`✅ Repository found: ${repository.name} (ID: ${repository.id})`);

    // Step 3: Check repository details
    log("Step 3: Checking repository details...");
    log(`Repository ID: ${repository.id}`);
    log(`Repository size: ${repository.size || 0} bytes`);
    log(`Default branch: ${repository.defaultBranch || "none"}`);
    log(`Is empty: ${repository.size === 0 ? "YES" : "NO"}`);

    // Step 4: Get branches/refs
    log("Step 4: Getting repository refs...");
    try {
      const refsResponse = await adoApi.get(
        `/${encodeURIComponent(project.id)}/_apis/git/repositories/${repository.id}/refs?filter=heads/&api-version=7.0`
      );

      const branches = refsResponse.data.value || [];
      log(`Found ${branches.length} branches`);

      if (branches.length === 0) {
        log(
          "⚠️ CRITICAL: Repository has no branches - this is likely the cause of the 400 error!"
        );
        log(
          "Cannot create feature branches in empty repositories without initial commit"
        );

        // Check if there are any commits at all
        try {
          const commitsResponse = await adoApi.get(
            `/${encodeURIComponent(project.id)}/_apis/git/repositories/${repository.id}/commits?api-version=7.0&$top=1`
          );
          log(`Commits found: ${commitsResponse.data.value?.length || 0}`);
        } catch (commitError) {
          log(
            "❌ Cannot check commits - repository appears to be completely empty"
          );
        }

        return; // Stop here as we found the issue
      }

      // Find default branch
      let defaultBranch =
        branches.find((ref) => ref.name === "refs/heads/main") ||
        branches.find((ref) => ref.name === "refs/heads/master") ||
        branches.find(
          (ref) =>
            ref.name.startsWith("refs/heads/") &&
            ref.objectId !== "0000000000000000000000000000000000000000"
        );

      if (!defaultBranch) {
        log("❌ No valid default branch found");
        return;
      }

      log(
        `✅ Default branch: ${defaultBranch.name} (${defaultBranch.objectId})`
      );

      // Step 5: Test branch creation
      log("Step 5: Testing branch creation...");
      const testBranchName = `test-branch-${Date.now()}`;

      const branchPayload = {
        refUpdates: [
          {
            name: `refs/heads/${testBranchName}`,
            oldObjectId: "0000000000000000000000000000000000000000",
            newObjectId: defaultBranch.objectId,
          },
        ],
      };

      log(
        `Testing branch creation with payload: ${JSON.stringify(branchPayload)}`
      );

      const createBranchResponse = await adoApi.post(
        `/${encodeURIComponent(project.id)}/_apis/git/repositories/${repository.id}/refs?api-version=7.0`,
        branchPayload
      );

      log("✅ Branch creation successful!");
      log(`Created branch: ${testBranchName}`);
    } catch (branchError) {
      log(`❌ Branch creation failed: ${branchError.message}`, "ERROR");

      if (branchError.response?.status === 400) {
        log("=== 400 ERROR ANALYSIS ===", "ERROR");
        const errorData = branchError.response.data;

        if (errorData.message) {
          log(`Azure DevOps error message: ${errorData.message}`, "ERROR");
        }

        if (errorData.typeKey) {
          log(`Error type: ${errorData.typeKey}`, "ERROR");
        }

        // Common 400 error scenarios
        if (
          errorData.message?.includes("branch") &&
          errorData.message?.includes("exist")
        ) {
          log("→ Likely cause: Branch already exists", "ERROR");
        } else if (
          errorData.message?.includes("empty") ||
          errorData.message?.includes("commit")
        ) {
          log(
            "→ Likely cause: Repository is empty or has no valid commits",
            "ERROR"
          );
        } else if (
          errorData.message?.includes("permission") ||
          errorData.message?.includes("access")
        ) {
          log("→ Likely cause: Insufficient permissions", "ERROR");
        } else {
          log("→ Unknown 400 error cause - check error details above", "ERROR");
        }
      }
    }
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, "ERROR");
  }
}

// Run the analysis
identifyBranchCreationIssue()
  .then(() => {
    log("=== Analysis completed ===");
  })
  .catch((error) => {
    log(`=== Analysis failed: ${error.message} ===`, "ERROR");
  });
