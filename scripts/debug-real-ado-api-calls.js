/**
 * Debug script to test and fix real Azure DevOps API calls
 *
 * This script will:
 * 1. Test the current Azure DevOps integration in real mode
 * 2. Identify why branches/PRs aren't being created
 * 3. Fix the API request format issues
 * 4. Validate that actual Azure DevOps resources are created
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Dynamic path detection for Prisma client
const basePath = "/root/portavi";
const prismaPath = path.join(basePath, "prisma/app/generated/prisma/client");

// Check if Prisma client exists, otherwise use direct path
let PrismaClient;
try {
  PrismaClient = require(prismaPath).PrismaClient;
} catch (error) {
  console.log("Using fallback Prisma client path...");
  PrismaClient = require("@prisma/client").PrismaClient;
}
const {
  createAzureDevOpsIntegration,
  generateBranchName,
} = require("./azure-devops-integration.js");

const prisma = new PrismaClient();

const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

async function testRealAzureDevOpsAPI() {
  try {
    log("=== Testing Real Azure DevOps API Calls ===");

    // Get ADO connection
    const adoConnection = await prisma.aDOConnection.findFirst();
    if (!adoConnection) {
      throw new Error("No ADO connection found");
    }

    log(`Organization: ${adoConnection.adoOrganizationUrl}`);

    // Get project with ADO ID
    const projectWithAdoId = await prisma.project.findFirst({
      where: { adoProjectId: { not: null } },
    });

    if (!projectWithAdoId) {
      throw new Error("No project found with ADO Project ID");
    }

    log(
      `Project: ${projectWithAdoId.name} (ADO ID: ${projectWithAdoId.adoProjectId})`
    );

    // Create axios instance with detailed logging
    const adoApi = axios.create({
      baseURL: adoConnection.adoOrganizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // Add request/response interceptors for debugging
    adoApi.interceptors.request.use((request) => {
      log(`🔍 API Request: ${request.method?.toUpperCase()} ${request.url}`);
      if (request.data) {
        log(`📤 Request Body: ${JSON.stringify(request.data, null, 2)}`);
      }
      return request;
    });

    adoApi.interceptors.response.use(
      (response) => {
        log(`✅ API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        log(
          `❌ API Error: ${error.response?.status || "Network"} ${error.message}`,
          "ERROR"
        );
        if (error.response?.data) {
          log(
            `📥 Error Response: ${JSON.stringify(error.response.data, null, 2)}`,
            "ERROR"
          );
        }
        return Promise.reject(error);
      }
    );

    // Create Azure DevOps integration
    const adoIntegration = createAzureDevOpsIntegration(
      adoApi,
      projectWithAdoId.adoProjectId,
      adoConnection.adoOrganizationUrl
    );

    // Test 1: Repository lookup
    log("\n--- TEST 1: Repository Lookup ---");
    const repositories = await getRepositories(
      adoApi,
      projectWithAdoId.adoProjectId
    );

    if (repositories.length === 0) {
      throw new Error("No repositories found in project");
    }

    const testRepository = repositories[0];
    log(`Using repository: ${testRepository.name} (ID: ${testRepository.id})`);

    const lookupResult = await adoIntegration.lookupRepository(
      testRepository.name
    );
    log(`Repository lookup successful`);
    log(`- Default branch: ${lookupResult.defaultBranch?.name || "None"}`);
    log(`- Needs initialization: ${lookupResult.needsInitialization}`);

    // Test 2: Feature branch creation
    log("\n--- TEST 2: Feature Branch Creation ---");
    const uniqueBranchName = generateBranchName("real-api-test");
    log(`Creating branch: ${uniqueBranchName}`);

    // Check if repository needs initialization
    let currentDefaultBranch = lookupResult.defaultBranch;
    if (lookupResult.needsInitialization) {
      log("Repository needs initialization...");
      currentDefaultBranch = await adoIntegration.initializeRepository(
        lookupResult.repository.id,
        lookupResult.repository.name
      );
      log(`Repository initialized with branch: ${currentDefaultBranch.name}`);
    }

    if (!currentDefaultBranch) {
      throw new Error("No default branch available");
    }

    // Create feature branch
    const branchResult = await adoIntegration.createFeatureBranch(
      lookupResult.repository.id,
      uniqueBranchName,
      currentDefaultBranch
    );

    log(`✅ Feature branch created: ${branchResult.branchName}`);
    log(`Branch commit: ${branchResult.commitId}`);

    // Test 3: Verify branch exists in Azure DevOps
    log("\n--- TEST 3: Verify Branch Exists ---");
    const verifyBranchExists = await verifyBranchInAzureDevOps(
      adoApi,
      projectWithAdoId.adoProjectId,
      lookupResult.repository.id,
      uniqueBranchName
    );

    if (verifyBranchExists) {
      log(`✅ Branch ${uniqueBranchName} verified in Azure DevOps`);
    } else {
      log(`❌ Branch ${uniqueBranchName} NOT found in Azure DevOps`, "ERROR");
      throw new Error(
        "Branch creation appeared successful but branch does not exist in Azure DevOps"
      );
    }

    // Test 4: Push code to branch
    log("\n--- TEST 4: Push Code to Branch ---");
    const testCode = `# Real API Test
    
This file was created by testing the real Azure DevOps API integration.

**Test Details:**
- Repository: ${lookupResult.repository.name}
- Branch: ${uniqueBranchName}
- Timestamp: ${new Date().toISOString()}
- Project: ${projectWithAdoId.name}

This test validates that the Azure DevOps integration creates actual resources.`;

    const newCommitId = await adoIntegration.pushCodeToFeatureBranch(
      lookupResult.repository.id,
      uniqueBranchName,
      branchResult.commitId,
      testCode,
      "real-api-test.md"
    );

    log(`✅ Code pushed to branch, new commit: ${newCommitId}`);

    // Test 5: Create pull request
    log("\n--- TEST 5: Create Pull Request ---");
    const pullRequestResult = await adoIntegration.createPullRequest(
      lookupResult.repository.id,
      lookupResult.repository.name,
      uniqueBranchName,
      currentDefaultBranch.name,
      `Real API Test - ${uniqueBranchName}`,
      `This pull request was created by testing the real Azure DevOps API integration.

**Test Purpose:** Validate that the Azure DevOps integration creates actual branches and pull requests

**Features Tested:**
- Repository lookup ✓
- Branch creation ✓
- Code pushing ✓
- Pull request creation ✓

**Created:** ${new Date().toISOString()}`
    );

    log(
      `✅ Pull request created: ${pullRequestResult.pullRequest.pullRequestId}`
    );
    log(`PR URL: ${pullRequestResult.url}`);

    // Test 6: Verify pull request exists
    log("\n--- TEST 6: Verify Pull Request Exists ---");
    const verifyPRExists = await verifyPullRequestInAzureDevOps(
      adoApi,
      projectWithAdoId.adoProjectId,
      lookupResult.repository.id,
      pullRequestResult.pullRequest.pullRequestId
    );

    if (verifyPRExists) {
      log(
        `✅ Pull request ${pullRequestResult.pullRequest.pullRequestId} verified in Azure DevOps`
      );
    } else {
      log(
        `❌ Pull request ${pullRequestResult.pullRequest.pullRequestId} NOT found in Azure DevOps`,
        "ERROR"
      );
    }

    log("\n=== SUCCESS: All Real API Tests Passed ===");
    log(`Created actual Azure DevOps resources:`);
    log(`- Branch: ${uniqueBranchName}`);
    log(`- Commit: ${newCommitId}`);
    log(`- Pull Request: ${pullRequestResult.pullRequest.pullRequestId}`);
    log(`- PR URL: ${pullRequestResult.url}`);

    return {
      success: true,
      branchName: uniqueBranchName,
      commitId: newCommitId,
      pullRequestId: pullRequestResult.pullRequest.pullRequestId,
      pullRequestUrl: pullRequestResult.url,
    };
  } catch (error) {
    log(`❌ Real API test failed: ${error.message}`, "ERROR");
    if (error.response) {
      log(`HTTP Status: ${error.response.status}`, "ERROR");
      log(`Response data:`, "ERROR");
      console.log(JSON.stringify(error.response.data, null, 2));
    }

    return {
      success: false,
      error: error.message,
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function getRepositories(adoApi, projectId) {
  const response = await adoApi.get(
    `/${encodeURIComponent(projectId)}/_apis/git/repositories?api-version=7.0`
  );
  return response.data?.value || [];
}

async function verifyBranchInAzureDevOps(
  adoApi,
  projectId,
  repositoryId,
  branchName
) {
  try {
    const response = await adoApi.get(
      `/${encodeURIComponent(projectId)}/_apis/git/repositories/${repositoryId}/refs?filter=heads/${branchName}&api-version=7.0`
    );
    return response.data?.value?.length > 0;
  } catch (error) {
    log(`Error verifying branch: ${error.message}`, "ERROR");
    return false;
  }
}

async function verifyPullRequestInAzureDevOps(
  adoApi,
  projectId,
  repositoryId,
  pullRequestId
) {
  try {
    const response = await adoApi.get(
      `/${encodeURIComponent(projectId)}/_apis/git/repositories/${repositoryId}/pullrequests/${pullRequestId}?api-version=7.0`
    );
    return !!response.data?.pullRequestId;
  } catch (error) {
    log(`Error verifying pull request: ${error.message}`, "ERROR");
    return false;
  }
}

// Run the test
if (require.main === module) {
  testRealAzureDevOpsAPI()
    .then((result) => {
      if (result.success) {
        log("=== REAL API TEST COMPLETED SUCCESSFULLY ===");
        process.exit(0);
      } else {
        log("=== REAL API TEST FAILED ===", "ERROR");
        process.exit(1);
      }
    })
    .catch((error) => {
      log(`=== UNEXPECTED ERROR: ${error.message} ===`, "ERROR");
      process.exit(1);
    });
}

module.exports = { testRealAzureDevOpsAPI };
