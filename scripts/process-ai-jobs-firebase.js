// scripts/process-ai-jobs-firebase.js
// AI Job Processor — Firebase/Firestore version
// Implements the Orchestrator Pattern with specialized agents:
//   Researcher → Coder → Reviewer (inspired by Google Cloud's distributed AI agents guide)
// Features: structured logging, correlation IDs, retry with backoff, step-by-step progress

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { findMatchingRepository } = require("./ado-repository-matcher.js");
const { encodeRepositoryName } = require("./repository-utils.js");
const { adminDb } = require("./firebase-admin-init.js");

const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Anthropic } = require("@anthropic-ai/sdk");
const axios = require("axios");

// ─── Structured Logger with Correlation IDs ─────────────────────────────

const logFile = path.join(__dirname, "process-ai-jobs.log");

function createLogger(correlationId) {
  return {
    _write(level, message, meta = {}) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        correlationId,
        message,
        ...meta,
      };
      const line = JSON.stringify(entry);
      fs.appendFileSync(logFile, line + "\n");
      // Human-readable console output
      const prefix = correlationId ? `[${correlationId.slice(0, 8)}]` : "";
      console.log(`${entry.timestamp} ${level.toUpperCase()} ${prefix} ${message}`);
    },
    info(message, meta) { this._write("info", message, meta); },
    warn(message, meta) { this._write("warn", message, meta); },
    error(message, meta) { this._write("error", message, meta); },
    debug(message, meta) { this._write("debug", message, meta); },
    step(stepName, status, meta) {
      this._write("info", `Step ${stepName}: ${status}`, { step: stepName, stepStatus: status, ...meta });
    },
  };
}

// Global logger for non-job-specific messages
const globalLog = createLogger(null);

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

async function getRetryableJobs() {
  const snap = await aiAgentJobsCol
    .where("status", "==", "FAILED")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((j) => (j.retryCount || 0) < (j.maxRetries || 3));
}

// ─── Step Progress Tracking ──────────────────────────────────────────────

async function recordStep(jobId, step, status, message) {
  const job = snapToDoc(await aiAgentJobsCol.doc(jobId).get());
  const stepHistory = job?.stepHistory || [];
  const entry = {
    step,
    status,
    timestamp: new Date().toISOString(),
    message,
  };

  // If completing a step, calculate duration from its "started" entry
  if (status === "completed" || status === "failed") {
    const startEntry = [...stepHistory].reverse().find(
      (e) => e.step === step && e.status === "started"
    );
    if (startEntry) {
      entry.durationMs = new Date(entry.timestamp) - new Date(startEntry.timestamp);
    }
  }

  stepHistory.push(entry);
  await updateJob(jobId, {
    currentStep: status === "completed" ? null : step,
    stepHistory,
  });
}

// ─── Resolve project -> adoConnection -> org -> aiProviderSettings ───────

async function resolveProjectChain(projectId) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error(`Project not found with ID: ${projectId}`);

  const adoConnectionId = project.adoConnectionId;
  if (!adoConnectionId) throw new Error("No ADO connection linked to this project");

  const adoConnection = await getAdoConnectionByOrgId(adoConnectionId);
  if (!adoConnection) throw new Error("No ADO connection found for this project");

  const organizationId = adoConnection.organizationId;
  if (!organizationId) throw new Error("No organization found for this project's ADO connection");

  const aiProviderSettingsList = await getAiProviderSettingsByOrg(organizationId);

  return { project, adoConnection, aiProviderSettings: aiProviderSettingsList };
}

// ─── AI Provider Implementations ─────────────────────────────────────────

async function callAIProvider(prompt, aiProviderSetting, log) {
  const provider = aiProviderSetting.provider?.toLowerCase();
  if (!provider) throw new Error("AI provider setting exists but provider field is empty");

  log.info(`Using AI provider: ${provider}, model: ${aiProviderSetting.model || "default"}`);

  if (provider.includes("openai")) {
    return await generateWithOpenAI(prompt, aiProviderSetting, log);
  } else if (provider.includes("google") || provider.includes("gemini")) {
    return await generateWithGoogle(prompt, aiProviderSetting, log);
  } else if (provider.includes("anthropic") || provider.includes("claude")) {
    return await generateWithAnthropic(prompt, aiProviderSetting, log);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function generateWithOpenAI(prompt, aiProviderSetting, log) {
  log.info(`Calling OpenAI with model: ${aiProviderSetting.model || "gpt-4"}`);
  if (!aiProviderSetting.apiKey) throw new Error("OpenAI API key not found in provider settings");

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
}

async function generateWithGoogle(prompt, aiProviderSetting, log) {
  const modelName = aiProviderSetting.model || "gemini-1.5-pro";
  log.info(`Calling Google Gemini with model: ${modelName}`);
  if (!aiProviderSetting.apiKey) throw new Error("Google API key not found in provider settings");

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
  } catch (modelError) {
    throw new Error(
      `Invalid or unavailable Google Gemini model: "${modelName}". Error: ${modelError.message}.`
    );
  }

  const result = await model.generateContent(prompt);
  const response = await result.response;

  let responseText = "";
  try {
    responseText = response.text();
  } catch (textError) {
    log.warn(`response.text() failed: ${textError.message}, trying alternatives`);
    if (response.candidates?.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content?.parts?.length > 0) {
        responseText = candidate.content.parts[0].text || "";
      } else if (candidate.content?.text) {
        responseText = candidate.content.text;
      } else if (candidate.content?.role === "model") {
        responseText = candidate.finishReason === "STOP"
          ? "[AI model completed processing but returned empty content]"
          : `[AI model status: ${candidate.finishReason || "processing"}]`;
      }
    }
    if (!responseText && response.text) {
      responseText = response.text;
    }
    if (!responseText) {
      throw new Error(`Unable to extract text from Google API response. Original: ${textError.message}`);
    }
  }

  if (!responseText?.trim()) {
    throw new Error(`Empty response from Google API for model ${modelName}.`);
  }

  log.info(`Google API returned ${responseText.length} characters`);
  return responseText;
}

async function generateWithAnthropic(prompt, aiProviderSetting, log) {
  log.info(`Calling Anthropic Claude with model: ${aiProviderSetting.model || "claude-3-sonnet-20240229"}`);
  if (!aiProviderSetting.apiKey) throw new Error("Anthropic API key not found in provider settings");

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
}

// ─── Specialized Agents (Orchestrator Pattern) ───────────────────────────
//
// Instead of a single monolithic prompt, we split into three specialized agents:
//   1. Researcher Agent — analyzes the work item and gathers context
//   2. Coder Agent — generates the implementation based on research
//   3. Reviewer Agent — QA checks the generated code

async function runResearcherAgent(job, aiProviderSetting, log) {
  log.step("RESEARCHING", "started");

  const researchPrompt = `You are a Research Agent. Your job is to analyze a work item and produce a concise research brief that a Coder Agent will use to implement the solution.

Analyze the following work item and provide:
1. A summary of what needs to be built
2. Key technical requirements extracted from the description and acceptance criteria
3. Suggested file structure and naming conventions
4. Any edge cases or potential pitfalls to watch for
5. Recommended approach (patterns, libraries, architecture)

Keep your response focused and structured. Do NOT write code — only provide the research brief.

---

${job.prompt}`;

  const researchContext = await callAIProvider(researchPrompt, aiProviderSetting, log);
  log.step("RESEARCHING", "completed", { contextLength: researchContext.length });
  return researchContext;
}

async function runCoderAgent(job, researchContext, aiProviderSetting, log) {
  log.step("GENERATING_CODE", "started");

  const coderPrompt = `You are a Coder Agent. A Research Agent has analyzed the requirements and produced the brief below. Use it to write clean, production-ready code.

## Research Brief
${researchContext}

## Original Work Item
${job.prompt}

## Instructions
- Write complete, working code based on the research brief
- Follow the suggested file structure and conventions
- Handle the edge cases identified by the researcher
- Include brief inline comments for non-obvious logic
- Do NOT include tests or documentation — focus only on implementation code`;

  const generatedCode = await callAIProvider(coderPrompt, aiProviderSetting, log);
  log.step("GENERATING_CODE", "completed", { codeLength: generatedCode.length });
  return generatedCode;
}

async function runReviewerAgent(job, generatedCode, researchContext, aiProviderSetting, log) {
  log.step("REVIEWING_CODE", "started");

  const reviewPrompt = `You are a Code Reviewer Agent. Review the following AI-generated code for quality and correctness.

## Original Requirements
${job.prompt}

## Research Brief
${researchContext}

## Generated Code
${generatedCode}

## Review Checklist
1. Does the code fulfill all requirements from the work item?
2. Are there any bugs, logic errors, or security vulnerabilities?
3. Does it handle the edge cases identified in the research brief?
4. Is the code clean and following good practices?

Respond with:
- APPROVED: if the code is ready for a PR (with optional minor suggestions)
- NEEDS_REVISION: if there are significant issues (list them clearly)

Then provide a brief summary of your findings.`;

  const reviewResult = await callAIProvider(reviewPrompt, aiProviderSetting, log);
  const isApproved = reviewResult.toUpperCase().includes("APPROVED");

  log.step("REVIEWING_CODE", "completed", { approved: isApproved, reviewLength: reviewResult.length });

  return { approved: isApproved, feedback: reviewResult };
}

// ─── ADO Repository Operations ──────────────────────────────────────────

async function getRepositoryMainBranchInfo(job, log) {
  const repositoryName = job.repositoryName;
  log.step("GETTING_REPO_INFO", "started", { repository: repositoryName });

  const adoConnection = await getFirstAdoConnection();
  if (!adoConnection) throw new Error("No ADO connection found");

  const adoApi = axios.create({
    baseURL: adoConnection.adoOrganizationUrl,
    headers: {
      Authorization: `Basic ${Buffer.from(`:${adoConnection.pat}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });

  let adoProjectId = job.adoProjectId;
  let projectName = job.projectName;

  if (!adoProjectId && job.projectId) {
    const project = await getProjectById(job.projectId);
    adoProjectId = project?.adoProjectId;
    projectName = project?.name;
  }

  if (!adoProjectId) {
    throw new Error("No ADO project ID available. Project must be linked to Azure DevOps.");
  }

  const encodedProjectId = encodeRepositoryName(adoProjectId);
  const encodedRepoName = encodeRepositoryName(repositoryName);

  const repoMatch = await findMatchingRepository(
    adoApi, adoProjectId, repositoryName, encodedProjectId, encodedRepoName
  );
  if (!repoMatch) throw new Error(`Repository not found: ${repositoryName}`);

  const actualRepoName = repoMatch.repositoryName || repositoryName;
  const actualEncodedRepoName = encodeRepositoryName(actualRepoName);

  const refsResponse = await adoApi.get(
    `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
  );

  let validRef = findValidRef(refsResponse);
  if (!validRef) {
    log.info("Repository is empty, initializing...");
    await initializeEmptyRepository(adoApi, encodedProjectId, actualEncodedRepoName, actualRepoName);

    const refsResponseAfterInit = await adoApi.get(
      `/${encodedProjectId}/_apis/git/repositories/${actualEncodedRepoName}/refs?filter=heads&api-version=7.0`
    );
    validRef = findValidRef(refsResponseAfterInit);
    if (!validRef) throw new Error("Failed to initialize repository or find valid branch");
  }

  log.step("GETTING_REPO_INFO", "completed", { mainBranch: validRef.name });

  return {
    adoApi, adoProjectId, projectName,
    repositoryName: actualRepoName,
    encodedProjectId,
    encodedRepoName: actualEncodedRepoName,
    mainBranchRef: validRef.name,
    mainBranchObjectId: validRef.objectId,
  };
}

async function createFeatureBranch(repositoryInfo, branchName, log) {
  log.step("CREATING_BRANCH", "started", { branch: branchName });

  const { adoApi, encodedProjectId, encodedRepoName, mainBranchObjectId } = repositoryInfo;

  const createBranchResponse = await adoApi.post(
    `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/refs?api-version=7.0`,
    {
      refUpdates: [{
        name: `refs/heads/${branchName}`,
        oldObjectId: "0000000000000000000000000000000000000000",
        newObjectId: mainBranchObjectId,
      }],
    }
  );

  if (!createBranchResponse.data?.value?.[0]) {
    throw new Error("Failed to create branch");
  }

  log.step("CREATING_BRANCH", "completed");

  return { ...repositoryInfo, branchName, branchCommitId: mainBranchObjectId };
}

async function pushCodeToFeatureBranch(branchInfo, generatedCode, log) {
  log.step("PUSHING_CODE", "started");

  const { adoApi, encodedProjectId, encodedRepoName, branchName, branchCommitId } = branchInfo;
  const fileName = "ai-generated-code.md";

  const pushResponse = await adoApi.post(
    `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
    {
      refUpdates: [{ name: `refs/heads/${branchName}`, oldObjectId: branchCommitId }],
      commits: [{
        comment: "AI generated code",
        changes: [{
          changeType: "add",
          item: { path: `/${fileName}` },
          newContent: { content: generatedCode, contentType: "rawtext" },
        }],
      }],
    }
  );

  if (!pushResponse.data?.commits?.[0]) {
    throw new Error("Failed to push code to branch");
  }

  const newCommitId = pushResponse.data.commits[0].commitId;
  log.step("PUSHING_CODE", "completed", { commitId: newCommitId });

  return { ...branchInfo, newCommitId, fileName };
}

async function createPullRequest(codeInfo, reviewFeedback, log) {
  log.step("CREATING_PR", "started");

  const { adoApi, encodedProjectId, encodedRepoName, branchName, mainBranchRef, repositoryName } = codeInfo;

  const prDescription = reviewFeedback
    ? `This pull request contains AI-generated code based on the provided requirements.\n\n## Code Review Summary\n${reviewFeedback}`
    : "This pull request contains AI-generated code based on the provided requirements.";

  const pullRequestData = {
    sourceRefName: `refs/heads/${branchName}`,
    targetRefName: mainBranchRef,
    title: `AI Generated Code - ${branchName}`,
    description: prDescription,
  };

  const prResponse = await adoApi.post(
    `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pullrequests?api-version=7.0`,
    pullRequestData
  );

  if (!prResponse.data?.pullRequestId) {
    throw new Error("Failed to create pull request");
  }

  const prId = prResponse.data.pullRequestId;
  const prUrl = `https://dev.azure.com/torslev/${encodeURIComponent(repositoryName)}/_git/${encodeURIComponent(repositoryName)}/pullrequest/${prId}`;

  log.step("CREATING_PR", "completed", { prUrl, prId });
  return prUrl;
}

// ─── Helper Functions ────────────────────────────────────────────────────

function findValidRef(refResponse) {
  if (!refResponse?.data?.value || refResponse.data.value.length === 0) return null;

  const mainRef = refResponse.data.value.find(
    (ref) => ref.name === "refs/heads/main" && ref.objectId && ref.objectId !== "0000000000000000000000000000000000000000"
  );
  if (mainRef) return mainRef;

  const masterRef = refResponse.data.value.find(
    (ref) => ref.name === "refs/heads/master" && ref.objectId && ref.objectId !== "0000000000000000000000000000000000000000"
  );
  if (masterRef) return masterRef;

  return refResponse.data.value.find(
    (ref) => ref.name.startsWith("refs/heads/") && ref.objectId && ref.objectId !== "0000000000000000000000000000000000000000"
  );
}

async function initializeEmptyRepository(adoApi, encodedProjectId, encodedRepoName, repositoryName) {
  const initialContent = `# ${repositoryName}\n\nThis repository was initialized automatically.\n`;

  const initResponse = await adoApi.post(
    `/${encodedProjectId}/_apis/git/repositories/${encodedRepoName}/pushes?api-version=7.0`,
    {
      refUpdates: [{ name: "refs/heads/main", oldObjectId: "0000000000000000000000000000000000000000" }],
      commits: [{
        comment: "Initial commit",
        changes: [{ changeType: "add", item: { path: "/README.md" }, newContent: { content: initialContent, contentType: "rawtext" } }],
      }],
    }
  );

  if (!initResponse.data?.commits?.[0]) throw new Error("Failed to initialize repository");
  return initResponse.data.commits[0].commitId;
}

function isTransientError(error) {
  const msg = (error.message || "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("timeout") ||
    msg.includes("network") || msg.includes("econnreset") ||
    msg.includes("503") || msg.includes("429") ||
    msg.includes("unavailable");
}

// ─── Main Job Processing — Orchestrator Pattern ─────────────────────────

async function processJob(job) {
  const correlationId = job.correlationId || crypto.randomUUID();
  const log = createLogger(correlationId);

  log.info(`Processing job ${job.id}`, {
    jobId: job.id,
    repository: job.repositoryName,
    retryCount: job.retryCount || 0,
  });

  const startTime = Date.now();

  try {
    // Update job status to IN_PROGRESS with correlation ID
    await updateJob(job.id, {
      status: "IN_PROGRESS",
      correlationId,
      currentStep: "RESEARCHING",
      errorMessage: null,
    });

    const { aiProviderSettings } = await resolveProjectChain(job.projectId);
    if (!aiProviderSettings.length) {
      throw new Error("No AI provider settings found for this organization");
    }
    const aiProviderSetting = aiProviderSettings[0];

    // ── Agent 1: Researcher ──────────────────────────────────────────
    await recordStep(job.id, "RESEARCHING", "started");
    const researchContext = await runResearcherAgent(job, aiProviderSetting, log);
    await recordStep(job.id, "RESEARCHING", "completed", `Research brief: ${researchContext.length} chars`);
    await updateJob(job.id, { researchContext, currentStep: "GENERATING_CODE" });

    // ── Agent 2: Coder ───────────────────────────────────────────────
    await recordStep(job.id, "GENERATING_CODE", "started");
    const generatedCode = await runCoderAgent(job, researchContext, aiProviderSetting, log);
    await recordStep(job.id, "GENERATING_CODE", "completed", `Generated ${generatedCode.length} chars`);
    await updateJob(job.id, { currentStep: "REVIEWING_CODE" });

    // ── Agent 3: Reviewer ────────────────────────────────────────────
    await recordStep(job.id, "REVIEWING_CODE", "started");
    const { approved, feedback } = await runReviewerAgent(
      job, generatedCode, researchContext, aiProviderSetting, log
    );
    await recordStep(job.id, "REVIEWING_CODE", "completed", approved ? "Code approved" : "Issues found");
    await updateJob(job.id, { reviewFeedback: feedback, currentStep: "GETTING_REPO_INFO" });

    if (!approved) {
      log.warn("Reviewer flagged issues but proceeding (feedback included in PR description)");
    }

    // ── ADO Operations ───────────────────────────────────────────────
    const timestamp = Date.now();
    const branchName = `ai-feature-${timestamp}`;

    await recordStep(job.id, "GETTING_REPO_INFO", "started");
    const repositoryInfo = await getRepositoryMainBranchInfo(job, log);
    await recordStep(job.id, "GETTING_REPO_INFO", "completed");
    await updateJob(job.id, { currentStep: "CREATING_BRANCH" });

    await recordStep(job.id, "CREATING_BRANCH", "started");
    const branchInfo = await createFeatureBranch(repositoryInfo, branchName, log);
    await recordStep(job.id, "CREATING_BRANCH", "completed");
    await updateJob(job.id, { currentStep: "PUSHING_CODE" });

    await recordStep(job.id, "PUSHING_CODE", "started");
    const codeInfo = await pushCodeToFeatureBranch(branchInfo, generatedCode, log);
    await recordStep(job.id, "PUSHING_CODE", "completed");
    await updateJob(job.id, { currentStep: "CREATING_PR" });

    await recordStep(job.id, "CREATING_PR", "started");
    const prUrl = await createPullRequest(codeInfo, feedback, log);
    await recordStep(job.id, "CREATING_PR", "completed");

    // ── Mark Completed ───────────────────────────────────────────────
    const durationMs = Date.now() - startTime;
    await updateJob(job.id, {
      status: "COMPLETED",
      pullRequestUrl: prUrl,
      currentStep: null,
    });

    log.info(`Job completed successfully`, { jobId: job.id, prUrl, durationMs });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const retryCount = (job.retryCount || 0) + 1;
    const maxRetries = job.maxRetries || 3;
    const canRetry = isTransientError(error) && retryCount < maxRetries;

    log.error(`Job failed: ${error.message}`, {
      jobId: job.id,
      durationMs,
      retryCount,
      canRetry,
      errorType: isTransientError(error) ? "transient" : "permanent",
    });

    // Record failure in step history
    if (job.currentStep) {
      await recordStep(job.id, job.currentStep, "failed", error.message).catch(() => {});
    }

    if (canRetry) {
      // Schedule for automatic retry by keeping status as PENDING with incremented retryCount
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
      log.info(`Scheduling retry #${retryCount} in ${backoffMs}ms`, { jobId: job.id });

      await updateJob(job.id, {
        status: "PENDING",
        retryCount,
        errorMessage: `Retry #${retryCount}: ${error.message}`,
        currentStep: null,
      });
    } else {
      await updateJob(job.id, {
        status: "FAILED",
        retryCount,
        errorMessage: error.message,
        currentStep: null,
      });
    }
  }
}

// ─── Main Worker Loop ────────────────────────────────────────────────────

async function main() {
  globalLog.info("AI Worker started (Firebase + Orchestrator Pattern)");
  globalLog.info("Agent pipeline: Researcher → Coder → Reviewer");

  while (true) {
    try {
      const pendingJobs = await getPendingJobs();

      if (pendingJobs.length > 0) {
        globalLog.info(`Found ${pendingJobs.length} pending job(s)`);
      }

      for (const job of pendingJobs) {
        // Check if this is a retry with backoff
        if (job.retryCount > 0) {
          const backoffMs = Math.min(1000 * Math.pow(2, job.retryCount), 30000);
          const updatedAt = job.updatedAt?.toDate ? job.updatedAt.toDate() : new Date(job.updatedAt);
          const timeSinceUpdate = Date.now() - updatedAt.getTime();

          if (timeSinceUpdate < backoffMs) {
            globalLog.debug(`Job ${job.id} in backoff, skipping (${Math.round((backoffMs - timeSinceUpdate) / 1000)}s remaining)`);
            continue;
          }
        }

        globalLog.info(`Processing job ${job.id} for repository ${job.repositoryName || "unknown"}`);
        await processJob(job);
      }
    } catch (error) {
      globalLog.error(`Error in polling cycle: ${error.message}`);
    }

    // Poll interval
    await new Promise((r) => setTimeout(r, 5000));
  }
}

main().catch((err) => {
  globalLog.error(`Fatal worker error: ${err.message}`);
  process.exit(1);
});
