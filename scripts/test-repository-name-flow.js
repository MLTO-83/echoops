/**
 * Comprehensive test for repository name flow in Azure DevOps integration
 *
 * This test simulates the complete flow from webhook creation to Step 3 completion,
 * focusing on repository name handling to identify where mismatches occur.
 *
 * Test scenarios:
 * 1. Exact repository name match
 * 2. Repository name mismatch (webhook config vs actual Azure DevOps name)
 * 3. Edge cases (spaces, special characters, case sensitivity)
 *
 * Usage:
 *   node test-repository-name-flow.js
 */

const express = require("express");

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());

// Logging helper
const log = (message, level = "INFO") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

// Mock database data to simulate ProjectWebhookConfig and AIAgentJob
const mockDatabaseData = {
  webhookConfigs: [
    {
      id: 1,
      repositoryName: "MasterData", // What user entered in UI
      projectName: "MyProject",
      organizationUrl: "https://dev.azure.com/myorg",
    },
    {
      id: 2,
      repositoryName: "MasterData management", // Exact match case
      projectName: "MyProject",
      organizationUrl: "https://dev.azure.com/myorg",
    },
    {
      id: 3,
      repositoryName: "masterdata-management", // Kebab case variation
      projectName: "MyProject",
      organizationUrl: "https://dev.azure.com/myorg",
    },
  ],
  aiJobs: [],
};

// Simulate creating AI job from webhook (like in /src/app/api/ado/webhook/route.ts)
function createMockAIJob(webhookConfigId, pat) {
  const webhookConfig = mockDatabaseData.webhookConfigs.find(
    (w) => w.id === webhookConfigId
  );
  if (!webhookConfig) {
    throw new Error(`Webhook config ${webhookConfigId} not found`);
  }

  const aiJob = {
    id: Math.random().toString(36).substr(2, 9),
    repositoryName: webhookConfig.repositoryName, // This is the key field from webhook config
    projectName: webhookConfig.projectName,
    organizationUrl: webhookConfig.organizationUrl,
    pat: pat,
    status: "pending",
    step: 3,
    createdAt: new Date().toISOString(),
  };

  mockDatabaseData.aiJobs.push(aiJob);
  return aiJob;
}

// Simulate Azure DevOps API responses
function mockAzureDevOpsAPI(organizationUrl, projectName) {
  // Mock project lookup
  const mockProject = {
    id: "project-123",
    name: projectName,
    url: `${organizationUrl}/${projectName}`,
  };

  // Mock repositories - notice the actual repository names might differ from webhook config
  const mockRepositories = [
    {
      id: "repo-1",
      name: "MasterData management", // Actual Azure DevOps repository name
      url: `${organizationUrl}/${projectName}/_git/MasterData%20management`,
      defaultBranch: "refs/heads/main",
    },
    {
      id: "repo-2",
      name: "UserService",
      url: `${organizationUrl}/${projectName}/_git/UserService`,
      defaultBranch: "refs/heads/master",
    },
    {
      id: "repo-3",
      name: "API Gateway",
      url: `${organizationUrl}/${projectName}/_git/API%20Gateway`,
      defaultBranch: "refs/heads/main",
    },
  ];

  return { project: mockProject, repositories: mockRepositories };
}

// Simulate Step 3 repository lookup logic (from process-ai-jobs.ts)
function simulateStep3RepositoryLookup(job) {
  log(
    `Step 3: Looking up repository "${job.repositoryName}" in project "${job.projectName}"`
  );

  const { project, repositories } = mockAzureDevOpsAPI(
    job.organizationUrl,
    job.projectName
  );

  // This is the critical logic from process-ai-jobs.ts line 126
  log(`Available repositories: ${repositories.map((r) => r.name).join(", ")}`);

  // Exact match first
  let repository = repositories.find(
    (repo) => repo.name === job.repositoryName
  );

  if (!repository) {
    log(
      `No exact match for "${job.repositoryName}". Trying case-insensitive search...`,
      "WARN"
    );
    repository = repositories.find(
      (repo) => repo.name.toLowerCase() === job.repositoryName.toLowerCase()
    );
  }

  if (!repository) {
    log(
      `No case-insensitive match for "${job.repositoryName}". Trying partial match...`,
      "WARN"
    );
    repository = repositories.find(
      (repo) =>
        repo.name.toLowerCase().includes(job.repositoryName.toLowerCase()) ||
        job.repositoryName.toLowerCase().includes(repo.name.toLowerCase())
    );
  }

  if (!repository) {
    throw new Error(
      `Repository "${job.repositoryName}" not found in project "${job.projectName}"`
    );
  }

  log(`Repository found: "${repository.name}" (ID: ${repository.id})`);

  // CRITICAL: This is where the repository name might change
  // The job.repositoryName (from webhook config) becomes repository.name (from Azure DevOps)
  const repositoryNameChange = job.repositoryName !== repository.name;

  if (repositoryNameChange) {
    log(`REPOSITORY NAME CHANGE DETECTED:`, "WARN");
    log(`  Original (from webhook config): "${job.repositoryName}"`, "WARN");
    log(`  Actual (from Azure DevOps):     "${repository.name}"`, "WARN");
  }

  return {
    project,
    repository,
    repositoryNameChanged: repositoryNameChange,
    originalName: job.repositoryName,
    actualName: repository.name,
  };
}

// Test endpoint for repository name flow
app.post("/test-repository-flow", async (req, res) => {
  const startTime = Date.now();
  log("=== Starting Repository Name Flow Test ===");

  try {
    const { webhookConfigId, pat, scenario } = req.body;

    if (!webhookConfigId || !pat) {
      return res.status(400).json({
        error: "Missing required parameters: webhookConfigId, pat",
      });
    }

    log(`Testing scenario: ${scenario || "default"}`);
    log(`Webhook Config ID: ${webhookConfigId}`);

    // Step 1: Create AI job from webhook config (simulates webhook handler)
    log("Step 1: Creating AI job from webhook config...");
    const aiJob = createMockAIJob(webhookConfigId, pat);
    log(`AI Job created with repository name: "${aiJob.repositoryName}"`);

    // Step 2: Simulate Step 3 repository lookup
    log("Step 2: Simulating Step 3 repository lookup...");
    const step3Result = simulateStep3RepositoryLookup(aiJob);

    // Step 3: Analyze results
    log("Step 3: Analyzing repository name handling...");
    const analysis = {
      webhookConfigRepositoryName: aiJob.repositoryName,
      azureDevOpsRepositoryName: step3Result.repository.name,
      repositoryNameChanged: step3Result.repositoryNameChanged,
      lookupSuccessful: !!step3Result.repository,
      potentialIssues: [],
    };

    // Identify potential issues
    if (step3Result.repositoryNameChanged) {
      analysis.potentialIssues.push({
        type: "REPOSITORY_NAME_MISMATCH",
        description:
          "Repository name from webhook config differs from Azure DevOps repository name",
        impact:
          "May cause issues in subsequent steps that rely on consistent repository naming",
      });
    }

    if (
      aiJob.repositoryName.includes(" ") ||
      step3Result.repository.name.includes(" ")
    ) {
      analysis.potentialIssues.push({
        type: "WHITESPACE_IN_NAME",
        description:
          "Repository name contains spaces which may cause URL encoding issues",
        impact: "Potential issues with API calls and branch creation",
      });
    }

    const executionTime = Date.now() - startTime;

    const result = {
      success: true,
      executionTime: `${executionTime}ms`,
      aiJob: {
        id: aiJob.id,
        repositoryName: aiJob.repositoryName,
        projectName: aiJob.projectName,
        step: aiJob.step,
      },
      step3Result: {
        projectFound: !!step3Result.project,
        repositoryFound: !!step3Result.repository,
        repositoryId: step3Result.repository?.id,
        repositoryName: step3Result.repository?.name,
        defaultBranch: step3Result.repository?.defaultBranch,
        repositoryNameChanged: step3Result.repositoryNameChanged,
      },
      analysis,
      recommendations: generateRecommendations(analysis),
    };

    log(`=== Test completed in ${executionTime}ms ===`);

    if (analysis.potentialIssues.length > 0) {
      log("POTENTIAL ISSUES DETECTED:", "WARN");
      analysis.potentialIssues.forEach((issue) => {
        log(`  ${issue.type}: ${issue.description}`, "WARN");
      });
    } else {
      log("No issues detected in repository name flow");
    }

    res.json(result);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    log(`Error in repository flow test: ${error.message}`, "ERROR");

    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: `${executionTime}ms`,
    });
  }
});

// Generate recommendations based on analysis
function generateRecommendations(analysis) {
  const recommendations = [];

  if (analysis.repositoryNameChanged) {
    recommendations.push({
      priority: "HIGH",
      action:
        "Ensure consistent repository name usage throughout the integration",
      details:
        "Consider updating the AI job with the actual Azure DevOps repository name after lookup",
    });
  }

  if (
    analysis.potentialIssues.some(
      (issue) => issue.type === "WHITESPACE_IN_NAME"
    )
  ) {
    recommendations.push({
      priority: "MEDIUM",
      action: "Implement proper URL encoding for repository names with spaces",
      details:
        "Use encodeURIComponent() when constructing URLs with repository names",
    });
  }

  if (analysis.potentialIssues.length === 0) {
    recommendations.push({
      priority: "LOW",
      action: "Current repository name handling appears correct",
      details:
        "No immediate changes needed, but continue monitoring for edge cases",
    });
  }

  return recommendations;
}

// Test scenario generator endpoint
app.get("/test-scenarios", (req, res) => {
  const scenarios = [
    {
      name: "Exact Match",
      description:
        "Repository name in webhook config exactly matches Azure DevOps",
      webhookConfigId: 2,
      expectedResult: "Success with no repository name change",
    },
    {
      name: "Name Mismatch",
      description:
        "Repository name in webhook config differs from Azure DevOps",
      webhookConfigId: 1,
      expectedResult: "Success but with repository name change detected",
    },
    {
      name: "Case Sensitivity",
      description: "Repository name differs only in case",
      webhookConfigId: 3,
      expectedResult: "Success with case-insensitive match",
    },
  ];

  res.json({
    availableScenarios: scenarios,
    webhookConfigs: mockDatabaseData.webhookConfigs.map((config) => ({
      id: config.id,
      repositoryName: config.repositoryName,
      projectName: config.projectName,
    })),
    usage: {
      endpoint: "/test-repository-flow",
      method: "POST",
      parameters: {
        webhookConfigId: "number (1, 2, or 3)",
        pat: "string (any value for mock)",
        scenario: "string (optional description)",
      },
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Repository Name Flow Test Server",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  log(`Repository Name Flow Test Server running on http://localhost:${PORT}`);
  log("Available endpoints:");
  log("  GET  /health - Health check");
  log("  GET  /test-scenarios - List available test scenarios");
  log("  POST /test-repository-flow - Run repository name flow test");
  log("");
  log("Example usage:");
  log(`  curl -X POST http://localhost:${PORT}/test-repository-flow \\`);
  log('    -H "Content-Type: application/json" \\');
  log(
    '    -d \'{"webhookConfigId": 1, "pat": "fake-pat", "scenario": "Name Mismatch Test"}\''
  );
  log("");
  log("Available test scenarios:");
  mockDatabaseData.webhookConfigs.forEach((config) => {
    log(
      `  Webhook Config ${config.id}: "${config.repositoryName}" -> Expected: "MasterData management"`
    );
  });
});
