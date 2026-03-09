#!/usr/bin/env node

/**
 * Test URL Encoding Fix
 *
 * This script tests the URL encoding fix to ensure we don't have double encoding issues.
 */

// Simulate the URL generation logic from the test file
function generateTestUrl(
  organizationUrl,
  projectName,
  repositoryName,
  pullRequestId
) {
  // Extract organization name
  let orgName;
  try {
    const url = new URL(organizationUrl);
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    orgName = pathParts[0];

    if (!orgName) {
      orgName = url.hostname.split(".")[0];
    }
  } catch (error) {
    orgName = "unknown-org";
  }

  // Prevent double encoding by decoding first if already encoded
  let cleanProjectName, cleanRepoName;
  try {
    cleanProjectName = decodeURIComponent(projectName);
    cleanRepoName = decodeURIComponent(repositoryName);
  } catch (error) {
    cleanProjectName = projectName;
    cleanRepoName = repositoryName;
  }

  // Generate URL
  const encodedProjectName = encodeURIComponent(cleanProjectName);
  const encodedRepoName = encodeURIComponent(cleanRepoName);

  return `https://dev.azure.com/${orgName}/${encodedProjectName}/_git/${encodedRepoName}/pullrequest/${pullRequestId}`;
}

console.log("=== URL Encoding Fix Test ===");

// Test cases
const testCases = [
  {
    name: "Normal names (no encoding needed)",
    organizationUrl: "https://dev.azure.com/torslev/",
    projectName: "MasterData management",
    repositoryName: "MasterData management",
    pullRequestId: 123,
  },
  {
    name: "Already encoded names (should decode then re-encode)",
    organizationUrl: "https://dev.azure.com/torslev/",
    projectName: "MasterData%20management",
    repositoryName: "MasterData%20management",
    pullRequestId: 123,
  },
  {
    name: "Double encoded names (should fix)",
    organizationUrl: "https://dev.azure.com/torslev/",
    projectName: "MasterData%2520management",
    repositoryName: "MasterData%2520management",
    pullRequestId: 123,
  },
];

testCases.forEach((testCase, index) => {
  console.log(`\n--- Test Case ${index + 1}: ${testCase.name} ---`);
  console.log(`Input project: "${testCase.projectName}"`);
  console.log(`Input repo: "${testCase.repositoryName}"`);

  const url = generateTestUrl(
    testCase.organizationUrl,
    testCase.projectName,
    testCase.repositoryName,
    testCase.pullRequestId
  );

  console.log(`Generated URL: ${url}`);

  // Check for double encoding issues
  if (url.includes("%2520")) {
    console.log("❌ ISSUE: Double encoding detected (%2520)");
  } else if (url.includes("%20")) {
    console.log("✅ GOOD: Proper single encoding (%20)");
  } else {
    console.log("✅ GOOD: No encoding issues");
  }
});

console.log("\n=== Test Complete ===");
