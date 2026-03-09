// Script to update process-ai-jobs.ts to fix repository name mismatch issue
// This script will update the AI job processor to use the new repository matcher

/**
 * How to use this helper:
 *
 * 1. Add this line at the top of your process-ai-jobs.ts file:
 *    const { findMatchingRepository } = require('./ado-repository-matcher.js');
 *
 * 2. Replace the repository lookup code in the createPR function with:
 *    // Get repository info with project name specified
 *    const repoInfo = await findMatchingRepository(
 *      adoApi,
 *      adoProjectName,
 *      repositoryName,
 *      encodedProjectName,
 *      encodedRepoName
 *    );
 *
 *    // Update variables with the matched repository information
 *    const actualRepoName = repoInfo.repositoryName;
 *    const actualEncodedRepoName = repoInfo.encodedRepoName;
 *    const repositoryId = repoInfo.repositoryId;
 *    const defaultBranch = repoInfo.defaultBranch;
 *    const projectName = repoInfo.projectName;
 *
 * 3. Update all subsequent API calls to use actualEncodedRepoName instead of encodedRepoName
 *
 * This will ensure that the correct repository is found even if there's a mismatch between
 * the stored repository name and the actual repository name in Azure DevOps.
 */

console.log("AI Job Processor Repository Matcher Helper");
console.log("===========================================");
console.log("To fix the repository name mismatch issue:");
console.log("1. Use the ado-repository-matcher.js helper module");
console.log(
  "2. Update your repository lookup code to use the findMatchingRepository function"
);
console.log(
  "3. Use the returned repository information in subsequent API calls"
);
console.log("");
console.log("See the comments in this file for detailed instructions.");
