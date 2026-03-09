#!/usr/bin/env node
// filepath: /root/portavi/scripts/run-repository-name-tests.js
/**
 * Automated test runner for repository name flow scenarios
 *
 * This script starts the test server and runs all repository name test scenarios
 * to identify potential issues in the Azure DevOps integration.
 *
 * Usage:
 *   node run-repository-name-tests.js
 */

const { spawn } = require("child_process");
const axios = require("axios");

const TEST_SERVER_PORT = 3002;
const TEST_SERVER_URL = `http://localhost:${TEST_SERVER_PORT}`;

// Logging helper
const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

// Test scenarios to run
const testScenarios = [
  {
    name: "Exact Match Test",
    webhookConfigId: 2,
    scenario: "Repository name matches exactly",
    expectedIssues: 0,
  },
  {
    name: "Name Mismatch Test",
    webhookConfigId: 1,
    scenario: "Repository name differs from Azure DevOps",
    expectedIssues: 1,
  },
  {
    name: "Case Sensitivity Test",
    webhookConfigId: 3,
    scenario: "Repository name differs in case/format",
    expectedIssues: 1,
  },
];

// Start test server
async function startTestServer() {
  return new Promise((resolve, reject) => {
    log("Starting repository name flow test server...");

    const serverProcess = spawn("node", ["test-repository-name-flow.js"], {
      cwd: __dirname,
      stdio: "pipe",
    });

    let serverReady = false;

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Repository Name Flow Test Server running")) {
        serverReady = true;
        log("Test server started successfully");
        resolve(serverProcess);
      }
    });

    serverProcess.stderr.on("data", (data) => {
      log(`Server error: ${data.toString()}`, "ERROR");
    });

    serverProcess.on("close", (code) => {
      if (!serverReady) {
        reject(new Error(`Server failed to start with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverReady) {
        serverProcess.kill();
        reject(new Error("Server startup timeout"));
      }
    }, 10000);
  });
}

// Wait for server to be ready
async function waitForServer() {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await axios.get(`${TEST_SERVER_URL}/health`);
      log("Server health check passed");
      return true;
    } catch (error) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error("Server health check failed after 30 attempts");
}

// Run a single test scenario
async function runTestScenario(scenario) {
  log(`\n=== Running ${scenario.name} ===`);
  log(`Scenario: ${scenario.scenario}`);

  try {
    const response = await axios.post(
      `${TEST_SERVER_URL}/test-repository-flow`,
      {
        webhookConfigId: scenario.webhookConfigId,
        pat: "fake-pat-for-testing",
        scenario: scenario.name,
      }
    );

    const result = response.data;

    if (!result.success) {
      log(`Test failed: ${result.error}`, "ERROR");
      return { success: false, error: result.error };
    }

    // Analyze results
    log(`Execution time: ${result.executionTime}`);
    log(`Webhook config repository: "${result.aiJob.repositoryName}"`);
    log(`Azure DevOps repository: "${result.step3Result.repositoryName}"`);
    log(`Repository name changed: ${result.step3Result.repositoryNameChanged}`);

    if (result.analysis.potentialIssues.length > 0) {
      log(
        `Potential issues detected: ${result.analysis.potentialIssues.length}`,
        "WARN"
      );
      result.analysis.potentialIssues.forEach((issue) => {
        log(`  ${issue.type}: ${issue.description}`, "WARN");
        log(`  Impact: ${issue.impact}`, "WARN");
      });
    } else {
      log("No issues detected");
    }

    if (result.recommendations.length > 0) {
      log("Recommendations:");
      result.recommendations.forEach((rec) => {
        log(`  [${rec.priority}] ${rec.action}`);
        log(`    ${rec.details}`);
      });
    }

    // Validate against expected results
    const issueCountMatch =
      result.analysis.potentialIssues.length === scenario.expectedIssues;
    if (!issueCountMatch) {
      log(
        `Expected ${scenario.expectedIssues} issues but found ${result.analysis.potentialIssues.length}`,
        "WARN"
      );
    }

    return {
      success: true,
      scenarioName: scenario.name,
      issuesFound: result.analysis.potentialIssues.length,
      expectedIssues: scenario.expectedIssues,
      issueCountMatch,
      repositoryNameChanged: result.step3Result.repositoryNameChanged,
      executionTime: result.executionTime,
      issues: result.analysis.potentialIssues,
      recommendations: result.recommendations,
    };
  } catch (error) {
    log(`Test scenario failed: ${error.message}`, "ERROR");
    return {
      success: false,
      scenarioName: scenario.name,
      error: error.message,
    };
  }
}

// Run all test scenarios
async function runAllTests() {
  log("=== Repository Name Flow Test Suite ===");

  let serverProcess;

  try {
    // Start test server
    serverProcess = await startTestServer();
    await waitForServer();

    // Run all test scenarios
    const results = [];

    for (const scenario of testScenarios) {
      const result = await runTestScenario(scenario);
      results.push(result);

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Generate summary report
    log("\n=== TEST SUMMARY ===");

    const successfulTests = results.filter((r) => r.success);
    const failedTests = results.filter((r) => !r.success);

    log(`Total tests: ${results.length}`);
    log(`Successful: ${successfulTests.length}`);
    log(`Failed: ${failedTests.length}`);

    if (failedTests.length > 0) {
      log("\nFailed tests:", "ERROR");
      failedTests.forEach((test) => {
        log(`  ${test.scenarioName}: ${test.error}`, "ERROR");
      });
    }

    // Analyze issues across all tests
    const allIssues = successfulTests.flatMap((test) => test.issues || []);
    const issueTypes = [...new Set(allIssues.map((issue) => issue.type))];

    if (issueTypes.length > 0) {
      log("\nIssues found across all tests:", "WARN");
      issueTypes.forEach((type) => {
        const count = allIssues.filter((issue) => issue.type === type).length;
        log(`  ${type}: ${count} occurrence(s)`, "WARN");
      });
    }

    // Key findings
    log("\n=== KEY FINDINGS ===");

    const repositoryNameChanges = successfulTests.filter(
      (test) => test.repositoryNameChanged
    );
    if (repositoryNameChanges.length > 0) {
      log(
        `Repository name changes detected in ${repositoryNameChanges.length} scenarios:`,
        "WARN"
      );
      repositoryNameChanges.forEach((test) => {
        log(`  ${test.scenarioName}`, "WARN");
      });
      log("This confirms the repository name mismatch issue exists", "WARN");
    } else {
      log("No repository name changes detected in any scenario");
    }

    // Generate recommendations
    log("\n=== RECOMMENDATIONS ===");
    const allRecommendations = successfulTests.flatMap(
      (test) => test.recommendations || []
    );
    const uniqueRecommendations = allRecommendations.filter(
      (rec, index, arr) =>
        arr.findIndex((r) => r.action === rec.action) === index
    );

    uniqueRecommendations.forEach((rec) => {
      log(`[${rec.priority}] ${rec.action}`);
      log(`  ${rec.details}`);
    });

    log("\n=== TEST COMPLETED ===");

    return {
      totalTests: results.length,
      successfulTests: successfulTests.length,
      failedTests: failedTests.length,
      repositoryNameChanges: repositoryNameChanges.length,
      issueTypes: issueTypes,
      recommendations: uniqueRecommendations,
    };
  } catch (error) {
    log(`Test suite failed: ${error.message}`, "ERROR");
    throw error;
  } finally {
    // Clean up server
    if (serverProcess) {
      log("Stopping test server...");
      serverProcess.kill();
    }
  }
}

// Main execution
if (require.main === module) {
  runAllTests()
    .then((summary) => {
      log(
        `Test suite completed. ${summary.successfulTests}/${summary.totalTests} tests passed.`
      );
      process.exit(summary.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      log(`Test suite failed: ${error.message}`, "ERROR");
      process.exit(1);
    });
}

module.exports = { runAllTests, runTestScenario };
