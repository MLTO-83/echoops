/**
 * Standalone HTTP server for testing Azure DevOps repository and branch creation
 *
 * This server provides an isolated test environment for Step 3 of the ADO integration:
 * - Project lookup by name
 * - Repository lookup within project
 * - Default branch detection
 * - Feature branch creation
 *
 * Usage:
 *   node test-ado-branch-creation-server.js
 *
 * Then test with curl:
 *   curl -X POST http://localhost:3001/test-branch-creation \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "pat": "your-personal-access-token",
 *       "organizationUrl": "https://dev.azure.com/yourorg",
 *       "projectName": "Your Project Name",
 *       "repositoryName": "your-repo-name",
 *       "featureBranchName": "feature/test-branch-123"
 *     }'
 */

const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Logging helper
const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

/**
 * Test endpoint for Azure DevOps branch creation
 */
app.post("/test-branch-creation", async (req, res) => {
  const startTime = Date.now();
  log("=== Starting ADO Branch Creation Test ===");

  try {
    // Validate input parameters
    const {
      pat,
      organizationUrl,
      projectName,
      repositoryName,
      featureBranchName,
    } = req.body;

    if (
      !pat ||
      !organizationUrl ||
      !projectName ||
      !repositoryName ||
      !featureBranchName
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
        required: [
          "pat",
          "organizationUrl",
          "projectName",
          "repositoryName",
          "featureBranchName",
        ],
        received: Object.keys(req.body),
      });
    }

    log(`Input parameters:`);
    log(`  - Organization URL: ${organizationUrl}`);
    log(`  - Project Name: ${projectName}`);
    log(`  - Repository Name: ${repositoryName}`);
    log(`  - Feature Branch Name: ${featureBranchName}`);

    // Create axios instance with authentication
    const adoApi = axios.create({
      baseURL: organizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    const testResults = {
      steps: {},
      timing: {},
      success: false,
    };

    // Step 1: Look up project by name
    log("\n--- STEP 1: Project Lookup ---");
    const step1Start = Date.now();

    try {
      const projectsResponse = await adoApi.get(
        "/_apis/projects?api-version=7.0"
      );
      log(
        `Projects API call successful. Found ${projectsResponse.data.count} projects.`
      );

      const project = projectsResponse.data.value.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
      );

      if (!project) {
        const availableProjects = projectsResponse.data.value.map(
          (p) => p.name
        );
        throw new Error(
          `Project '${projectName}' not found. Available projects: ${availableProjects.join(", ")}`
        );
      }

      log(`✅ Project found: ${project.name} (ID: ${project.id})`);
      testResults.steps.projectLookup = {
        success: true,
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description,
      };
      testResults.timing.projectLookup = Date.now() - step1Start;
    } catch (error) {
      log(`❌ Project lookup failed: ${error.message}`);
      testResults.steps.projectLookup = {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
      };
      testResults.timing.projectLookup = Date.now() - step1Start;

      return res.status(500).json({
        success: false,
        error: "Project lookup failed",
        details: testResults,
      });
    }

    const project = testResults.steps.projectLookup;

    // Step 2: Look up repository within project
    log("\n--- STEP 2: Repository Lookup ---");
    const step2Start = Date.now();

    try {
      const reposUrl = `/${encodeURIComponent(project.projectId)}/_apis/git/repositories?api-version=7.0`;
      log(`Making repository API call: ${reposUrl}`);

      const repositoriesResponse = await adoApi.get(reposUrl);
      log(
        `Repositories API call successful. Found ${repositoriesResponse.data.count} repositories.`
      );

      if (repositoriesResponse.data.value.length === 0) {
        throw new Error(`No repositories found in project '${projectName}'`);
      }

      // Log all available repositories
      log("Available repositories:");
      repositoriesResponse.data.value.forEach((repo, index) => {
        log(`  ${index + 1}. ${repo.name} (ID: ${repo.id})`);
      });

      // Find the target repository (exact match first, then case-insensitive)
      let repository = repositoriesResponse.data.value.find(
        (r) => r.name === repositoryName
      );
      if (!repository) {
        repository = repositoriesResponse.data.value.find(
          (r) => r.name.toLowerCase() === repositoryName.toLowerCase()
        );
      }

      if (!repository) {
        const availableRepos = repositoriesResponse.data.value.map(
          (r) => r.name
        );
        throw new Error(
          `Repository '${repositoryName}' not found. Available repositories: ${availableRepos.join(", ")}`
        );
      }

      log(`✅ Repository found: ${repository.name} (ID: ${repository.id})`);
      testResults.steps.repositoryLookup = {
        success: true,
        repositoryId: repository.id,
        repositoryName: repository.name,
        repositoryUrl: repository.webUrl,
        defaultBranch: repository.defaultBranch,
      };
      testResults.timing.repositoryLookup = Date.now() - step2Start;
    } catch (error) {
      log(`❌ Repository lookup failed: ${error.message}`);
      testResults.steps.repositoryLookup = {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
      };
      testResults.timing.repositoryLookup = Date.now() - step2Start;

      return res.status(500).json({
        success: false,
        error: "Repository lookup failed",
        details: testResults,
      });
    }

    const repository = testResults.steps.repositoryLookup;

    // Step 3: Get default branch details
    log("\n--- STEP 3: Default Branch Detection ---");
    const step3Start = Date.now();

    try {
      // Get the default branch name (remove refs/heads/ prefix if present)
      let defaultBranchName = repository.defaultBranch;
      if (defaultBranchName?.startsWith("refs/heads/")) {
        defaultBranchName = defaultBranchName.substring("refs/heads/".length);
      }

      if (!defaultBranchName) {
        // Fallback: try to get branches and use the first one
        const branchesUrl = `/${encodeURIComponent(project.projectId)}/_apis/git/repositories/${repository.repositoryId}/refs?filter=heads/&api-version=7.0`;
        log(`No default branch found, fetching all branches: ${branchesUrl}`);

        const branchesResponse = await adoApi.get(branchesUrl);
        if (branchesResponse.data.value.length === 0) {
          throw new Error("Repository has no branches");
        }

        // Use the first branch as default
        const firstBranch = branchesResponse.data.value[0];
        defaultBranchName = firstBranch.name.replace("refs/heads/", "");
        log(`Using first available branch as default: ${defaultBranchName}`);
      }

      // Get the commit details for the default branch
      const branchUrl = `/${encodeURIComponent(project.projectId)}/_apis/git/repositories/${repository.repositoryId}/refs?filter=heads/${encodeURIComponent(defaultBranchName)}&api-version=7.0`;
      log(`Getting default branch details: ${branchUrl}`);

      const branchResponse = await adoApi.get(branchUrl);

      if (branchResponse.data.value.length === 0) {
        throw new Error(`Default branch '${defaultBranchName}' not found`);
      }

      const defaultBranch = branchResponse.data.value[0];
      log(
        `✅ Default branch found: ${defaultBranch.name} (Commit: ${defaultBranch.objectId})`
      );

      testResults.steps.defaultBranchDetection = {
        success: true,
        branchName: defaultBranchName,
        branchRef: defaultBranch.name,
        commitId: defaultBranch.objectId,
      };
      testResults.timing.defaultBranchDetection = Date.now() - step3Start;
    } catch (error) {
      log(`❌ Default branch detection failed: ${error.message}`);
      testResults.steps.defaultBranchDetection = {
        success: false,
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
      };
      testResults.timing.defaultBranchDetection = Date.now() - step3Start;

      return res.status(500).json({
        success: false,
        error: "Default branch detection failed",
        details: testResults,
      });
    }

    const defaultBranch = testResults.steps.defaultBranchDetection;

    // Step 4: Create feature branch
    log("\n--- STEP 4: Feature Branch Creation ---");
    const step4Start = Date.now();

    try {
      // Ensure feature branch name starts with refs/heads/
      const fullBranchRef = featureBranchName.startsWith("refs/heads/")
        ? featureBranchName
        : `refs/heads/${featureBranchName}`;

      log(`Creating feature branch: ${fullBranchRef}`);
      log(`Base commit: ${defaultBranch.commitId}`);

      const createBranchPayload = [
        {
          name: fullBranchRef,
          oldObjectId: "0000000000000000000000000000000000000000", // This indicates a new ref
          newObjectId: defaultBranch.commitId,
        },
      ];

      const createBranchUrl = `/${encodeURIComponent(project.projectId)}/_apis/git/repositories/${repository.repositoryId}/refs?api-version=7.0`;
      log(`Branch creation API call: ${createBranchUrl}`);
      log(`Payload: ${JSON.stringify(createBranchPayload, null, 2)}`);

      const branchCreationResponse = await adoApi.post(
        createBranchUrl,
        createBranchPayload
      );

      if (
        branchCreationResponse.data.value &&
        branchCreationResponse.data.value.length > 0
      ) {
        const createdBranch = branchCreationResponse.data.value[0];
        log(`✅ Feature branch created successfully: ${createdBranch.name}`);

        testResults.steps.branchCreation = {
          success: true,
          branchName: featureBranchName,
          branchRef: createdBranch.name,
          commitId: createdBranch.newObjectId,
          baseCommitId: defaultBranch.commitId,
        };
      } else {
        throw new Error(
          "Branch creation response did not contain expected data"
        );
      }

      testResults.timing.branchCreation = Date.now() - step4Start;
    } catch (error) {
      log(`❌ Feature branch creation failed: ${error.message}`);

      // Check if it's a conflict (branch already exists)
      if (error.response?.status === 409) {
        log("Branch already exists - this might be expected behavior");
        testResults.steps.branchCreation = {
          success: false,
          error: "Branch already exists",
          statusCode: 409,
          branchName: featureBranchName,
        };
      } else {
        testResults.steps.branchCreation = {
          success: false,
          error: error.message,
          statusCode: error.response?.status,
          statusText: error.response?.statusText,
          responseData: error.response?.data,
        };
      }

      testResults.timing.branchCreation = Date.now() - step4Start;

      return res.status(500).json({
        success: false,
        error: "Feature branch creation failed",
        details: testResults,
      });
    }

    // Success!
    testResults.success = true;
    testResults.timing.total = Date.now() - startTime;

    log("\n=== ✅ ALL STEPS COMPLETED SUCCESSFULLY ===");
    log(`Total execution time: ${testResults.timing.total}ms`);

    res.json({
      success: true,
      message: "Branch creation test completed successfully",
      results: testResults,
    });
  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`);

    res.status(500).json({
      success: false,
      error: "Unexpected error occurred",
      details: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "ADO Branch Creation Test Server",
  });
});

// Start server
app.listen(PORT, () => {
  log(`🚀 ADO Branch Creation Test Server running on http://localhost:${PORT}`);
  log("");
  log("Usage:");
  log("  curl -X POST http://localhost:3001/test-branch-creation \\");
  log('    -H "Content-Type: application/json" \\');
  log("    -d '{");
  log('      "pat": "your-personal-access-token",');
  log('      "organizationUrl": "https://dev.azure.com/yourorg",');
  log('      "projectName": "Your Project Name",');
  log('      "repositoryName": "your-repo-name",');
  log('      "featureBranchName": "feature/test-branch-123"');
  log("    }'");
  log("");
  log("Health check: curl http://localhost:3001/health");
});

module.exports = app;
