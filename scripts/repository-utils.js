/**
 * This is a utility file that contains a simplified version of the repository matcher
 * for use when the full repository matcher is not available (e.g., in fallback cases)
 */

/**
 * Simple function to encode a repository name
 * @param {string} repositoryName - The repository name to encode
 * @returns {string} The encoded repository name
 */
function encodeRepositoryName(repositoryName) {
  if (!repositoryName) return "";
  return encodeURIComponent(repositoryName);
}

module.exports = {
  encodeRepositoryName,
};
