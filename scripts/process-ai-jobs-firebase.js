// scripts/process-ai-jobs-firebase.js
// AI Job Processor — Firebase/Firestore version
// Replaces the Prisma/PostgreSQL-based process-ai-jobs.js

const fs = require("fs");
const path = require("path");
const { findMatchingRepository } = require("./ado-repository-matcher.js");
const { encodeRepositoryName } = require("./repository-utils.js");
const { adminDb } = require("./firebase-admin-init.js");

const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Anthropic } = require("@anthropic-ai/sdk");
const axios = require("axios");

// Set up logging to file
const logFile = path.join(__dirname, "process-ai-jobs.log");
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// ─── Firestore Collection References ─────────────────────────────────────

const projectsCol = adminDb.collection("projects");
const adoConnectionsCol = adminDb.collection("adoConnections");
const aiProviderSettingsCol = adminDb.collection("aiProviderSettings");
const aiAgentJobsCol = adminDb.collection("aiAgentJobs");

// ─── Firestore helper ────────────────────────────────────────────────────

function snapToDoc(snap) {
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Data Access ─────────────────────────────────────────────────────────

async function getProjectById(projectId) {
  const snap = await projectsCol.doc(projectId).get();
  return snapToDoc(snap);
}

async function getAdoConnectionByOrgId(organizationId) {
  // In Firestore, the doc ID for adoConnections equals the organizationId
  const snap = await adoConnectionsCol.doc(organizationId).get();
  return snapToDoc(snap);
}

async function getFirstAdoConnection() {
  const snap = await adoConnectionsCol.limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getAiProviderSettingsByOrg(organizationId) {
  const snap = await aiProviderSettingsCol
    .where("organizationId", "==", organizationId)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function updateJob(jobId, data) {
  await aiAgentJobsCol.doc(jobId).update({ ...data, updatedAt: new Date() });
}

async function getPendingJobs() {
  const snap = await aiAgentJobsCol
    .where("status", "==", "PENDING")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getFailedJobsWithSpacesInRepo() {
  const snap = await aiAgentJobsCol.where("status", "==", "FAILED").get();
  // Firestore has no "contains" operator for substrings, so filter in-memory
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((j) => j.repositoryName && j.repositoryName.includes(" "));
}

// ─── Resolve project -> adoConnection -> org -> aiProviderSettings ───────

async function resolveProjectChain(projectId) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error(`Project not found with ID: ${projectId}`);

  // Get ADO connection via the project's adoConnectionId
  const adoConnectionId = project.adoConnectionId;
  if (!adoConnectionId) throw new Error("No ADO connection linked to this project");

  const adoConnection = await getAdoConnectionByOrgId(adoConnectionId);
  if (!adoConnection) throw new Error("No ADO connection found for this project");

  const organizationId = adoConnection.organizationId;
  if (!organizationId) throw new Error("No organization found for this project's ADO connection");

  const aiProviderSettingsList = await getAiProviderSettingsByOrg(organizationId);

  return { project, adoConnection, aiProviderSettings: aiProviderSettingsList };
}

/**
 * STEP 1: Prompt AI provider for code generation
 */
async function promptAIProvider(job) {
  log(`Step 1: Prompting AI provider for job ${job.id}`);

  const { prompt } = job;

  try {
    const { project, adoConnection, aiProviderSettings } =
      await resolveProjectChain(job.projectId);

    log(`Project found: Yes`);
    log(`ADO Connection: Yes`);
    log(`Organization: ${adoConnection.organizationId}`);
    log(`AI Provider Settings: ${aiProviderSettings.length} found`);

    if (!aiProviderSettings.length) {
      throw new Error("No AI provider settings found for this organization");
    }

    const aiProviderSetting = aiProviderSettings[0];
    const provider = aiProviderSetting.provider?.toLowerCase();

    if (!provider) {
      throw new Error("AI provider setting exists but provider field is empty");
    }

    log(
      `Using AI provider: ${provider} with model: ${
        aiProviderSetting.model || "default"
      }`
    );

    if (provider.includes("openai")) {
      return await generateWithOpenAI(prompt, aiProviderSetting);
    } else if (provider.includes("google") || provider.includes("gemini")) {
      return await generateWithGoogle(prompt, aiProviderSetting);
    } else if (provider.includes("anthropic") || provider.includes("claude")) {
      return await generateWithAnthropic(prompt, aiProviderSetting);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    log(`Error in Step 1 - AI provider call failed: ${error.message}`);
    throw new Error(`AI provider failed: ${error.message}`);
  }
}

/**
 * STEP 3: Get ADO repository main branch ID
 */
async function getRepositoryMainBranchInfo(job) {
  const repositoryName = job.repositoryName;
  log(`Step 3: Getting repository main branch info for ${repositoryName}`);

  try {
    // Get ADO connection details
    const adoConnection = await getFirstAdoConnection();
    if (!adoConnection) {
      throw new Error("No ADO connection found");
    }

    const adoApi = axios.create({
      baseURL: adoConnection.adoOrganizationUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString(
          "base64"
        )}`,
        "Content-Type": "application/json",
      },
    });

    // Get project info — need to resolve the project doc to get adoProjectId
    let adoProjectId = job.adoProjectId;
    let projectName = job.projectName;

    if (!adoProjectId && job.projectId) {
      const project = await getProjectById(job.projectId);
      adoProjectId = project?.adoProjectId;
      projectName = project?.name;
    }

    log(
      `DEBUG: Project info - ${
        projectName
          ? `Project: ${projectName} (adoProjectId: ${adoProjectId})`
          : "No project info available"
      }`
    );

    if (!adoProjectId) {
      throw new Error(
        "No ADO project ID available in job. Project must be linked to Azure DevOps."
      );
    }

    const encodedProjectId = encodeRepositoryName(adoProjectId);
    const encodedRepoName = encodeRepositoryName(repositoryName);

    // Find the matching repository using the helper function
    const repoMatch = await findMatchingRepository(
      adoApi,
      adoProjectId,
      repositoryName,
      encodedProjectId,
      encodedRepoName
    );
    if (!repoMatch) {
      throw new Error(`Repository not found: ${repositoryName}`);
    }

    const actualRepoName = repoMatch.repositoryName || repositoryName;
    const actualEncodedRepoName = encodeRepositoryName(actualRepoName);

    // Get repository refs to find main branch
    const refsResponse = await adoApi.get(
      `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
    );

    const validRef = findValidRef(refsResponse);
    if (!validRef) {
      log(`Repository is empty, initializing...`);
      await initializeEmptyRepository(
        adoApi,
        encodedProjectId,
        actualEncodedRepoName,
        actualRepoName
      );

      const refsResponseAfterInit = await adoApi.get(
        `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
      );
      const validRefAfterInit = findValidRef(refsResponseAfterInit);

      if (!validRefAfterInit) {
        throw new Error("Failed to initialize repository or find valid branch");
      }

      return {
        adoApi,
        adoProjectId,
        projectName,
        repositoryName: actualRepoName,
        encodedProjectId,
        encodedRepoName: actualEncodedRepoName,
        mainBranchRef: validRefAfterInit.name,
        mainBranchObjectId: validRefAfterInit.objectId,
      };
    }

    return {
      adoApi,
      adoProjectId,
      projectName,
      repositoryName: actualRepoName,
      encodedProjectId,
      encodedRepoName: actualEncodedRepoName,
      mainBranchRef: validRef.name,
      mainBranchObjectId: validRef.objectId,
    };
  } catch (error) {
    log(`Error in Step 3 - Repository info retrieval failed: ${error.message}`);
    throw new Error(`Repository info retrieval failed: ${error.message}`);
  }
}

/**
 * STEP 4: Create feature branch
 */
async function createFeatureBranch(repositoryInfo, branchName) {
  log(`Step 4: Creating feature branch ${branchName}`);

  const { adoApi, encodedProjectId, encodedRepoName, mainBranchObjectId } =
    repositoryInfo;

  try {
    log(`Creating branch: ${branchName} from commit ${mainBranchObjectId}`);

    const createBranchResponse = await adoApi.post(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/refs?api-version=7.0`,
      {
        refUpdates: [
          {
            name: `refs/heads/${branchName}`,
            oldObjectId: "0000000000000000000000000000000000000000",
            newObjectId: mainBranchObjectId,
          },
        ],
      }
    );

    if (!createBranchResponse.data?.value?.[0]) {
      throw new Error("Failed to create branch");
    }

    log(`Branch ${branchName} created successfully`);

    return {
      ...repositoryInfo,
      branchName,
      branchCommitId: mainBranchObjectId,
    };
  } catch (error) {
    log(`Error in Step 4 - Branch creation failed: ${error.message}`);
    throw new Error(`Branch creation failed: ${error.message}`);
  }
}

/**
 * STEP 5: Push generated code to feature branch
 */
async function pushCodeToFeatureBranch(branchInfo, generatedCode) {
  log(
    `Step 5: Pushing generated code to feature branch ${branchInfo.branchName}`
  );

  const {
    adoApi,
    encodedProjectId,
    encodedRepoName,
    branchName,
    branchCommitId,
  } = branchInfo;

  try {
    const fileName = "ai-generated-code.md";
    log(`Adding file ${fileName} to branch ${branchName}`);

    const pushResponse = await adoApi.post(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
      {
        refUpdates: [
          {
            name: `refs/heads/${branchName}`,
            oldObjectId: branchCommitId,
          },
        ],
        commits: [
          {
            comment: "AI generated code",
            changes: [
              {
                changeType: "add",
                item: {
                  path: `/${fileName}`,
                },
                newContent: {
                  content: generatedCode,
                  contentType: "rawtext",
                },
              },
            ],
          },
        ],
      }
    );

    if (!pushResponse.data?.commits?.[0]) {
      throw new Error("Failed to push code to branch");
    }

    const newCommitId = pushResponse.data.commits[0].commitId;
    log(`Code pushed to branch ${branchName}, new commit: ${newCommitId}`);

    return {
      ...branchInfo,
      newCommitId,
      fileName,
    };
  } catch (error) {
    log(`Error in Step 5 - Code push failed: ${error.message}`);
    throw new Error(`Code push failed: ${error.message}`);
  }
}

/**
 * STEP 6: Create pull request
 */
async function createPullRequest(codeInfo) {
  log(`Step 6: Creating pull request for branch ${codeInfo.branchName}`);

  const {
    adoApi,
    encodedProjectId,
    encodedRepoName,
    branchName,
    mainBranchRef,
    repositoryName,
  } = codeInfo;

  try {
    const pullRequestData = {
      sourceRefName: `refs/heads/${branchName}`,
      targetRefName: mainBranchRef,
      title: `AI Generated Code - ${branchName}`,
      description:
        "This pull request contains AI-generated code based on the provided requirements.",
    };

    log(`Creating pull request: ${pullRequestData.title}`);

    const prResponse = await adoApi.post(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pullrequests?api-version=7.0`,
      pullRequestData
    );

    if (!prResponse.data?.pullRequestId) {
      throw new Error("Failed to create pull request");
    }

    const prId = prResponse.data.pullRequestId;
    const prUrl = `https://dev.azure.com/torslev/${encodeURIComponent(
      repositoryName
    )}/_git/${encodeURIComponent(repositoryName)}/pullrequest/${prId}`;

    log(`Pull request created successfully: ${prUrl}`);
    return prUrl;
  } catch (error) {
    log(`Error in Step 6 - Pull request creation failed: ${error.message}`);
    throw new Error(`Pull request creation failed: ${error.message}`);
  }
}

/**
 * Helper function to find valid ref from API response
 */
function findValidRef(refResponse) {
  if (!refResponse?.data?.value || refResponse.data.value.length === 0) {
    return null;
  }

  let mainRef = refResponse.data.value.find(
    (ref) =>
      ref.name === "refs/heads/main" &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );
  if (mainRef) return mainRef;

  let masterRef = refResponse.data.value.find(
    (ref) =>
      ref.name === "refs/heads/master" &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );
  if (masterRef) return masterRef;

  return refResponse.data.value.find(
    (ref) =>
      ref.name.startsWith("refs/heads/") &&
      ref.objectId &&
      ref.objectId !== "0000000000000000000000000000000000000000"
  );
}

/**
 * Initialize an empty repository with a README.md file
 */
async function initializeEmptyRepository(
  adoApi,
  encodedProjectId,
  encodedRepoName,
  repositoryName
) {
  log(`Initializing empty repository: ${repositoryName}`);

  try {
    const initialContent = `# ${repositoryName}\n\nThis repository was initialized automatically.\n`;

    const initResponse = await adoApi.post(
      `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
      {
        refUpdates: [
          {
            name: "refs/heads/main",
            oldObjectId: "0000000000000000000000000000000000000000",
          },
        ],
        commits: [
          {
            comment: "Initial commit",
            changes: [
              {
                changeType: "add",
                item: { path: "/README.md" },
                newContent: {
                  content: initialContent,
                  contentType: "rawtext",
                },
              },
            ],
          },
        ],
      }
    );

    if (!initResponse.data?.commits?.[0]) {
      throw new Error("Failed to initialize repository");
    }

    log(`Repository ${repositoryName} initialized with initial commit`);
    return initResponse.data.commits[0].commitId;
  } catch (error) {
    log(`Failed to initialize repository: ${error.message}`);
    throw new Error(`Repository initialization failed: ${error.message}`);
  }
}

/**
 * AI Provider implementations
 */
async function generateWithOpenAI(prompt, aiProviderSetting) {
  log(`Calling OpenAI with model: ${aiProviderSetting.model || "gpt-4"}`);

  if (!aiProviderSetting.apiKey) {
    throw new Error("OpenAI API key not found in provider settings");
  }

  try {
    const openai = new OpenAI({ apiKey: aiProviderSetting.apiKey });

    const response = await openai.chat.completions.create({
      model: aiProviderSetting.model || "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: aiProviderSetting.maxTokens || 2000,
      temperature: aiProviderSetting.temperature || 0.7,
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    return response.choices[0].message.content;
  } catch (error) {
    log(`OpenAI API error: ${error.message}`);
    throw new Error(`OpenAI generation failed: ${error.message}`);
  }
}

async function generateWithGoogle(prompt, aiProviderSetting) {
  const modelName = aiProviderSetting.model || "gemini-1.5-pro";
  log(`Calling Google Gemini with model: ${modelName}`);

  if (!aiProviderSetting.apiKey) {
    throw new Error("Google API key not found in provider settings");
  }

  try {
    const genAI = new GoogleGenerativeAI(aiProviderSetting.apiKey);

    let model;
    try {
      model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: aiProviderSetting.temperature || 0.7,
          maxOutputTokens: aiProviderSetting.maxTokens || 2000,
        },
      });
      log(`Model ${modelName} initialized successfully`);
    } catch (modelError) {
      throw new Error(
        `Invalid or unavailable Google Gemini model: "${modelName}". Error: ${modelError.message}. Please check the model name and availability at: https://ai.google.dev/gemini-api/docs/models`
      );
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;

    let responseText = "";

    try {
      responseText = response.text();
      log(`Method 1: Successfully extracted text using response.text()`);
    } catch (textError) {
      log(
        `Method 1 failed: ${textError.message}, trying alternative parsing methods...`
      );

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];

        if (candidate.content) {
          if (candidate.content.parts && candidate.content.parts.length > 0) {
            responseText = candidate.content.parts[0].text || "";
          } else if (candidate.content.text) {
            responseText = candidate.content.text;
          } else if (candidate.content.role === "model") {
            if (candidate.finishReason === "STOP") {
              responseText =
                "[AI model completed processing but returned empty content]";
            } else {
              responseText = `[AI model status: ${
                candidate.finishReason || "processing"
              }]`;
            }
          }
        }
      }

      if (!responseText && response.text) {
        responseText = response.text;
      }

      if (!responseText) {
        throw new Error(
          `Unable to extract text from Google API response for model ${modelName}. Original error: ${textError.message}`
        );
      }
    }

    if (!responseText || responseText.trim() === "") {
      throw new Error(
        `Empty response from Google API for model ${modelName}.`
      );
    }

    log(`Google API returned ${responseText.length} characters`);
    return responseText;
  } catch (error) {
    log(`Google API error: ${error.message}`);
    throw new Error(`Google generation failed: ${error.message}`);
  }
}

async function generateWithAnthropic(prompt, aiProviderSetting) {
  log(
    `Calling Anthropic Claude with model: ${
      aiProviderSetting.model || "claude-3-sonnet-20240229"
    }`
  );

  if (!aiProviderSetting.apiKey) {
    throw new Error("Anthropic API key not found in provider settings");
  }

  try {
    const anthropic = new Anthropic({ apiKey: aiProviderSetting.apiKey });

    const response = await anthropic.messages.create({
      model: aiProviderSetting.model || "claude-3-sonnet-20240229",
      max_tokens: aiProviderSetting.maxTokens || 2000,
      temperature: aiProviderSetting.temperature || 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    if (!response.content?.[0]?.text) {
      throw new Error("Invalid response from Anthropic API");
    }

    return response.content[0].text;
  } catch (error) {
    log(`Anthropic API error: ${error.message}`);
    throw new Error(`Anthropic generation failed: ${error.message}`);
  }
}

/**
 * Main job processing function - follows the 6-step sequence
 */
async function processJob(job) {
  log(`\n=== Processing Job ${job.id} - Repository: ${job.repositoryName} ===`);

  try {
    // Update job status to IN_PROGRESS
    await updateJob(job.id, { status: "IN_PROGRESS" });

    const timestamp = Date.now();
    const branchName = `ai-feature-${timestamp}`;

    // STEP 1: Prompt AI provider for code
    log(`\n--- STEP 1: Prompting AI Provider ---`);
    const generatedCode = await promptAIProvider(job);
    log(`Generated code length: ${generatedCode.length} characters`);

    // STEP 2: AI Response Received
    log(`\n--- STEP 2: AI Response Received ---`);

    // STEP 3: Get ADO repository main branch ID
    log(`\n--- STEP 3: Getting Repository Info ---`);
    const repositoryInfo = await getRepositoryMainBranchInfo(job);
    log(
      `Repository info retrieved - Main branch: ${repositoryInfo.mainBranchRef}`
    );

    // STEP 4: Create feature branch
    log(`\n--- STEP 4: Creating Feature Branch ---`);
    const branchInfo = await createFeatureBranch(repositoryInfo, branchName);
    log(`Feature branch created successfully`);

    // STEP 5: Push generated code to feature branch
    log(`\n--- STEP 5: Pushing Code to Feature Branch ---`);
    const codeInfo = await pushCodeToFeatureBranch(branchInfo, generatedCode);
    log(`Code pushed to feature branch successfully`);

    // STEP 6: Create pull request
    log(`\n--- STEP 6: Creating Pull Request ---`);
    const prUrl = await createPullRequest(codeInfo);
    log(`Pull request created: ${prUrl}`);

    // Mark job completed
    await updateJob(job.id, {
      status: "COMPLETED",
      pullRequestUrl: prUrl,
    });

    log(`\n=== Job ${job.id} completed successfully ===\n`);
  } catch (error) {
    const errorMsg = `Job ${job.id} failed: ${error.message}`;
    log(`\n=== ${errorMsg} ===\n`);

    await updateJob(job.id, {
      status: "FAILED",
      errorMessage: error.message,
    });
  }
}

/**
 * Main worker loop
 */
async function main() {
  log("AI Worker started (Firebase), polling for jobs...");

  try {
    const failedJobsWithSpaces = await getFailedJobsWithSpacesInRepo();
    if (failedJobsWithSpaces.length > 0) {
      log(
        `Found ${failedJobsWithSpaces.length} failed jobs with spaces in repository names`
      );
    }

    while (true) {
      log("Checking for pending jobs...");
      const pendingJobs = await getPendingJobs();
      log(`Found ${pendingJobs.length} pending jobs`);

      for (const job of pendingJobs) {
        log(
          `Processing job ${job.id} for repository ${
            job.repositoryName || "unknown"
          }`
        );
        await processJob(job);
      }

      // Poll interval
      log("Waiting for next polling cycle...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  } catch (error) {
    log(`Fatal worker error: ${error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  log(`Worker error: ${err.message}`);
  process.exit(1);
});
