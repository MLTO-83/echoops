// test-repository-matcher.js
// Test script for the repository name mismatch fix

const { findMatchingRepository } = require("./ado-repository-matcher.js");
const axios = require("axios");

/**
 * Simulated ADO API for testing
 */
class MockAdoApi {
  constructor(repositories) {
    this.repositories = repositories || [];
  }

  async get(url) {
    console.log(`Mock API GET: ${url}`);

    // Simulate repository lookup
    if (url.includes("/_apis/git/repositories/")) {
      const repoNameMatch = url.match(/repositories\/([^?]+)/);
      if (repoNameMatch) {
        const encodedRepoName = repoNameMatch[1];
        const repoName = decodeURIComponent(encodedRepoName);

        // Find matching repository
        const repo = this.repositories.find((r) => r.name === repoName);
        if (repo) {
          console.log(`Found repository: ${repo.name}`);
          return { data: repo };
        } else if (url.includes("repositories?api-version")) {
          // Return all repositories when listing
          console.log(`Returning all ${this.repositories.length} repositories`);
          return { data: { value: this.repositories } };
        } else {
          // Simulate 404 for not found
          const error = new Error(`Repository not found: ${repoName}`);
          error.response = { status: 404 };
          throw error;
        }
      }
    }

    // Default response
    return { data: null };
  }
}

/**
 * Run test with specific repository configurations
 */
async function runTest() {
  console.log("Testing Repository Matcher Utility");
  console.log("=================================");

  // Test cases
  const testCases = [
    {
      name: "Exact Match",
      projectName: "Project1",
      repositoryName: "Repository1",
      repositories: [
        {
          name: "Repository1",
          id: "repo1-id",
          defaultBranch: "main",
          project: { name: "Project1" },
        },
      ],
    },
    {
      name: "Project Name Match",
      projectName: "Project2",
      repositoryName: "NonExistentRepo",
      repositories: [
        {
          name: "Project2",
          id: "repo2-id",
          defaultBranch: "main",
          project: { name: "Project2" },
        },
      ],
    },
    {
      name: "Similar Name Match",
      projectName: "Project3",
      repositoryName: "MasterData",
      repositories: [
        {
          name: "MasterData management",
          id: "repo3-id",
          defaultBranch: "main",
          project: { name: "Project3" },
        },
        {
          name: "OtherRepo",
          id: "repo4-id",
          defaultBranch: "main",
          project: { name: "Project3" },
        },
      ],
    },
    {
      name: "First Available Fallback",
      projectName: "Project4",
      repositoryName: "CompletelyDifferent",
      repositories: [
        {
          name: "FallbackRepo",
          id: "repo5-id",
          defaultBranch: "main",
          project: { name: "Project4" },
        },
        {
          name: "AnotherRepo",
          id: "repo6-id",
          defaultBranch: "main",
          project: { name: "Project4" },
        },
      ],
    },
  ];

  // Run each test case
  for (const testCase of testCases) {
    console.log(`\nTest Case: ${testCase.name}`);
    console.log(
      `Project: ${testCase.projectName}, Repository: ${testCase.repositoryName}`
    );

    const mockApi = new MockAdoApi(testCase.repositories);
    const encodedProjectName = encodeURIComponent(testCase.projectName);
    const encodedRepoName = encodeURIComponent(testCase.repositoryName);

    try {
      const result = await findMatchingRepository(
        mockApi,
        testCase.projectName,
        testCase.repositoryName,
        encodedProjectName,
        encodedRepoName
      );

      console.log("SUCCESS: Repository matched successfully");
      console.log(`Found repository: ${result.repositoryName}`);
      console.log(`Repository ID: ${result.repositoryId}`);
      console.log(`Project: ${result.projectName}`);
      console.log(`Encoded Name: ${result.encodedRepoName}`);
    } catch (error) {
      console.log(`ERROR: ${error.message}`);
    }

    console.log("-".repeat(50));
  }
}

// Run the tests
runTest().catch((err) => {
  console.error("Test failed:", err);
});
