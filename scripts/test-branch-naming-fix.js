#!/usr/bin/env node

/**
 * Test script to verify unique branch naming implementation
 * This verifies that the production code generates unique branch names correctly
 */

const { generateBranchName } = require("./azure-devops-integration.js");

console.log("Testing unique branch name generation...\n");

// Generate multiple branch names to verify uniqueness
const branchNames = [];
for (let i = 0; i < 10; i++) {
  const branchName = generateBranchName("ai-feature");
  branchNames.push(branchName);
  console.log(`Branch ${i + 1}: ${branchName}`);

  // Small delay to ensure timestamp differences
  await new Promise((resolve) => setTimeout(resolve, 10));
}

// Verify all branch names are unique
const uniqueNames = [...new Set(branchNames)];
console.log(`\nGenerated ${branchNames.length} branch names`);
console.log(`Unique branch names: ${uniqueNames.length}`);

if (branchNames.length === uniqueNames.length) {
  console.log("✅ SUCCESS: All branch names are unique!");
  console.log("✅ The unique branch naming fix is working correctly.");
} else {
  console.log("❌ ERROR: Duplicate branch names detected!");
  console.log("❌ The unique branch naming fix needs attention.");
}

console.log("\nBranch name pattern analysis:");
branchNames.forEach((name, index) => {
  const parts = name.split("-");
  console.log(
    `  ${index + 1}. Prefix: ${parts[0]}-${parts[1]}, Timestamp: ${parts[2]}, Random: ${parts[3]}`
  );
});

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
