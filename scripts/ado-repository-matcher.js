// Repository name matcher helper for process-ai-jobs.ts
// This helper file will be used by process-ai-jobs.ts to match repository names correctly

/**
 * Function to match repository names with Azure DevOps projects
 * Handles cases where the repository name is different from the project name
 * @param {Object} adoApi - Axios instance configured for ADO API
 * @param {string} adoProjectId - ADO Project ID (GUID) - the official identifier for API calls
 * @param {string} repositoryName - Name of the repository as stored in our system
 * @param {string} encodedProjectId - URL-encoded project ID (GUID)
 * @param {string} encodedRepoName - URL-encoded repository name
 * @returns {Promise<Object>} Information about the matched repository
 */
async function findMatchingRepository(
  adoApi,
  adoProjectId,
  repositoryName,
  encodedProjectId,
  encodedRepoName
) {
  const log = console.log; // Simplified log function for testing

  // First try with the repository name as provided
  try {
    log(
      `Attempting to find repository "${repositoryName}" in project ID "${adoProjectId}"`
    );
    const repoResponse = await adoApi.get(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}?api-version=7.0`
    );

    if (repoResponse.data) {
      log(`Found repository with name: "${repositoryName}"`);
      return {
        repositoryName: repositoryName,
        encodedRepoName: encodedRepoName,
        repositoryId: repoResponse.data.id,
        defaultBranch: repoResponse.data.defaultBranch,
        projectName: repoResponse.data.project.name,
        repoData: repoResponse.data,
      };
    }
  } catch (error) {
    log(
      `Repository "${repositoryName}" not found in project ID "${adoProjectId}", trying alternatives`
    );
  }

  // If that fails, get all repositories in the project and try to find a match
  try {
    log(`Listing all repositories in project ID "${adoProjectId}"`);

    const allReposResponse = await adoApi.get(
      `/${encodedProjectId}/_apis/git/repositories?api-version=7.0`
    );

    if (
      allReposResponse.data &&
      allReposResponse.data.value &&
      allReposResponse.data.value.length > 0
    ) {
      const repos = allReposResponse.data.value;
      log(`Found ${repos.length} repositories in the project`);

      // Try to find a repository with a name that includes our repository name
      let matchedRepo = repos.find(
        (r) =>
          r.name.toLowerCase().includes(repositoryName.toLowerCase()) ||
          repositoryName.toLowerCase().includes(r.name.toLowerCase())
      );

      if (matchedRepo) {
        log(`Found a similar repository: "${matchedRepo.name}"`);
        return {
          repositoryName: matchedRepo.name,
          encodedRepoName: encodeURIComponent(matchedRepo.name),
          repositoryId: matchedRepo.id,
          defaultBranch: matchedRepo.defaultBranch,
          projectName: matchedRepo.project.name,
          repoData: matchedRepo,
        };
      }

      // If no match by name, return the first repository as a fallback
      log(
        `No similar repository found, using the first available repository: "${repos[0].name}"`
      );
      return {
        repositoryName: repos[0].name,
        encodedRepoName: encodeURIComponent(repos[0].name),
        repositoryId: repos[0].id,
        defaultBranch: repos[0].defaultBranch,
        projectName: repos[0].project.name,
        repoData: repos[0],
      };
    }
  } catch (error) {
    log(`Error listing repositories: ${error.message}`);
  }

  // If all attempts fail
  throw new Error(
    `Repository not found. Tried with name "${repositoryName}" in project ID "${adoProjectId}" but couldn't find a match.`
  );
}

module.exports = { findMatchingRepository };
