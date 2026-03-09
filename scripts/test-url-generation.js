#!/usr/bin/env node

/**
 * Test URL generation to verify correct Azure DevOps URL format
 */

// Test URL generation function
function generateCorrectAzureDevOpsUrl(
  organizationUrl,
  repositoryName,
  pullRequestId
) {
  // Extract organization name from organizationUrl
  let orgName;
  try {
    const url = new URL(organizationUrl);
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    orgName = pathParts[0]; // Get 'torslev' from '/torslev/'

    if (!orgName) {
      orgName = url.hostname.split(".")[0];
    }
  } catch (error) {
    orgName = "unknown-org";
  }

  // Prevent double encoding by decoding first if already encoded
  let cleanRepoName;
  try {
    cleanRepoName = decodeURIComponent(repositoryName);
  } catch (error) {
    cleanRepoName = repositoryName;
  }

  // Azure DevOps repository URL format: https://dev.azure.com/org/_git/reponame/pullrequest/id
  return `https://dev.azure.com/${orgName}/_git/${encodeURIComponent(cleanRepoName)}/pullrequest/${pullRequestId}`;
}

// Test cases
const testCases = [
  {
    organizationUrl: "https://dev.azure.com/torslev/",
    repositoryName: "MasterData management",
    pullRequestId: 123,
    expected:
      "https://dev.azure.com/torslev/_git/MasterData%20management/pullrequest/123",
  },
  {
    organizationUrl: "https://dev.azure.com/torslev",
    repositoryName: "MasterData management",
    pullRequestId: 456,
    expected:
      "https://dev.azure.com/torslev/_git/MasterData%20management/pullrequest/456",
  },
  {
    organizationUrl: "https://dev.azure.com/torslev/",
    repositoryName: "MasterData%20management", // Already encoded
    pullRequestId: 789,
    expected:
      "https://dev.azure.com/torslev/_git/MasterData%20management/pullrequest/789",
  },
];

console.log("Testing Azure DevOps URL generation...\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`  Organization URL: ${testCase.organizationUrl}`);
  console.log(`  Repository Name: ${testCase.repositoryName}`);
  console.log(`  Pull Request ID: ${testCase.pullRequestId}`);

  const result = generateCorrectAzureDevOpsUrl(
    testCase.organizationUrl,
    testCase.repositoryName,
    testCase.pullRequestId
  );

  console.log(`  Generated URL: ${result}`);
  console.log(`  Expected URL:  ${testCase.expected}`);
  console.log(`  ✅ Match: ${result === testCase.expected ? "YES" : "NO"}`);
  console.log("");
});

console.log("URL generation test completed!");
