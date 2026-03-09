"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/app/components/FirebaseAuthProvider";

interface AIAgentPanelProps {
  projectId: string;
  projectName: string;
  adoProjectId: string;
}

export default function AIAgentPanel({
  projectId,
  projectName,
  adoProjectId,
}: AIAgentPanelProps) {
  const { data: session, status } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [repository, setRepository] = useState("");
  const [repositories, setRepositories] = useState<
    {
      id: string;
      name: string;
      url: string;
      defaultBranch?: string;
      projectId: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: "idle" | "pending" | "success" | "error";
    jobId?: string;
    message?: string;
    pullRequestUrl?: string;
  }>({
    status: "idle",
  });
  const [userLicense, setUserLicense] = useState("FREE");
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState("");
  const [aiProviderConfig, setAiProviderConfig] = useState<{
    provider: string;
    model: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Enhanced webhook setup state
  const [webhookSetup, setWebhookSetup] = useState({
    isSetupComplete: false,
    webhookCreated: false, // New state to track if webhook is created
    isTestingConnection: false,
    testResult: null as null | { success: boolean; message: string },
    verified: false, // New state to track if the webhook has been verified as working
  });

  // Added webhook secret state
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isWebhookActive, setIsWebhookActive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  // Add state to track if a key has been saved to the database
  const [isKeySaved, setIsKeySaved] = useState(false);
  // Add state for webhook description
  const [webhookDescription, setWebhookDescription] = useState("");

  // Add state for webhook configuration details
  const [webhookConfig, setWebhookConfig] = useState<{
    repositoryName?: string;
    agentInstructions?: string;
  }>({
    repositoryName: "",
    agentInstructions: "",
  });

  // Add state to track AI jobs
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Add state for editing webhook config
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [editedAgentInstructions, setEditedAgentInstructions] = useState("");
  const [editedRepository, setEditedRepository] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchRepositories = async () => {
    try {
      // Don't load repositories if AI provider is not configured
      if (!isConfigured) {
        console.log("AI Provider not configured - skipping repository loading");
        return;
      }

      // Check if we have adoProjectId before making the request
      if (!adoProjectId) {
        console.log(
          "No Azure DevOps Project ID provided - repos will not be loaded"
        );
        return;
      }

      console.log(`Fetching repositories for ADO project: ${adoProjectId}`);
      const res = await fetch(`/api/ado/projects/${adoProjectId}/repos`, {
        headers: {
          Accept: "application/json",
        },
        // Include session cookie in the request
        credentials: "include",
      });

      if (!res.ok) {
        let errorMessage = "Unknown error";
        try {
          const errorData = await res.json();
          errorMessage =
            errorData.error || res.statusText || "Failed to load repositories";
        } catch (parseError) {
          errorMessage = res.statusText || `HTTP error ${res.status}`;
        }

        console.error(`Repository loading error: ${errorMessage}`);
        // Silently handle error for better UX - will show empty dropdown
        setRepositories([]);
        return;
      }

      const data = await res.json();
      console.log(
        `Successfully loaded ${data.repositories?.length || 0} repositories`
      );
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error("Error in fetchRepositories:", error);
      setRepositories([]);
    }
  };

  // Fetch user profile and check if AI agent is available
  useEffect(() => {
    if (status === "authenticated") {
      fetchUserProfile();
      fetchWebhookConfig();
      fetchSavedAgentConfiguration();
      fetchJobs();
    }
  }, [status, projectId, adoProjectId]);

  // Only fetch repositories when isConfigured changes and is true
  useEffect(() => {
    if (isConfigured) {
      fetchRepositories();
    }
  }, [isConfigured, adoProjectId]);

  // Added function to fetch webhook configuration
  const fetchWebhookConfig = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhook-config?includeSecret=true`
      );
      if (response.ok) {
        const data = await response.json();

        // Enhanced debug logging to help diagnose webhook active state issues
        console.log("Received webhook config:", JSON.stringify(data));

        // Determine whether we have a direct webhook config object or nested webhookConfig property
        // This handles both response formats that might exist in different environments
        const webhookData = data.webhookConfig || data; // Use direct data if no webhookConfig property

        console.log("Processing webhook data:", JSON.stringify(webhookData));
        console.log("Webhook active value:", webhookData.active);
        console.log("Webhook active type:", typeof webhookData.active);

        if (webhookData) {
          setWebhookSecret(webhookData.secret || "");

          // Enhanced logic to handle multiple active value formats
          const activeValue = webhookData.active;
          // Handle various formats: boolean true, string "true", number 1, string "1"
          // Using type-safe comparisons
          const isActive =
            activeValue === true ||
            String(activeValue).toLowerCase() === "true" ||
            Number(activeValue) === 1 ||
            String(activeValue) === "1";

          console.log("Determined active state:", isActive);
          setIsWebhookActive(isActive);

          // Also set the webhook description if available
          setWebhookDescription(webhookData.description || "");
          // Update isKeySaved based on existing configuration
          setIsKeySaved(!!webhookData.secret);
          // Store repository name and agent instructions
          setWebhookConfig({
            repositoryName: webhookData.repositoryName || "",
            agentInstructions: webhookData.agentInstructions || "",
          });

          // Use the updated isActive variable and ensure we have the secret
          const hasSecret = !!webhookData.secret;

          // CRITICAL FIX: Log the secret state to help with debugging
          console.log(
            "Webhook secret present:",
            hasSecret ? "Yes" : "No",
            hasSecret ? `(length: ${webhookData.secret.length})` : ""
          );

          // If we got a secret from the server but it's not set in our local state,
          // that's likely why the UI is showing as not configured after refresh
          if (hasSecret && !webhookSecret) {
            console.log("Updating local secret state from server");
          }

          // Update webhook setup state tracking
          // Mark webhook as created if we have a secret
          setWebhookSetup((prev) => ({
            ...prev,
            isSetupComplete: isActive, // Setup is now considered complete if webhook is active in database
            webhookCreated: hasSecret,
            verified: hasSecret, // Assume webhook is verified if it has a secret
          }));

          // Update isConfigured state based ONLY on the active field
          // This will unlock the AI Agent controls when the webhook is active
          if (isActive && hasSecret) {
            // Only update isConfigured if the AI provider is configured,
            // which we'll check by making a request to the AI provider endpoint
            const aiProviderResponse = await fetch("/api/settings/ai-provider");
            if (aiProviderResponse.ok) {
              const aiProviderData = await aiProviderResponse.json();
              const isAIConfigured =
                aiProviderData.aiProviderSettings &&
                aiProviderData.aiProviderSettings.length > 0;

              if (isAIConfigured) {
                // Enable configuration if webhook is active and AI provider is configured
                setIsConfigured(true);
                // If everything is configured, also fetch repositories
                fetchRepositories();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching webhook configuration:", error);
    }
  };

  // Added function to save webhook configuration
  const saveWebhookConfig = async () => {
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      // Ensure we always save active state as a boolean
      const booleanActive =
        isWebhookActive === true ||
        String(isWebhookActive).toLowerCase() === "true" ||
        Number(isWebhookActive) === 1 ||
        String(isWebhookActive) === "1";

      console.log(
        "Saving webhook with active value:",
        booleanActive,
        "original value was:",
        isWebhookActive,
        "type:",
        typeof isWebhookActive
      );

      // DEBUGGING: Log what we're about to send to the server
      console.log(
        "Sending webhook config to server:",
        JSON.stringify({
          secret: webhookSecret,
          active: booleanActive,
        })
      );

      const response = await fetch(
        `/api/projects/${projectId}/webhook-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: webhookSecret,
            active: booleanActive, // Always send as a boolean
            // Include existing values to avoid losing them
            repositoryName: webhookConfig.repositoryName || "",
            agentInstructions: webhookConfig.agentInstructions || "",
            description: webhookDescription || "",
          }),
        }
      );

      if (response.ok) {
        setSaveSuccess(true); // Update key saved status and webhook created state
        setIsKeySaved(true);

        // Get response data
        const responseData = await response.json();

        // Enhanced debug logging for webhook configuration
        console.log(
          "Webhook configuration saved with active value:",
          isWebhookActive,
          "of type:",
          typeof isWebhookActive
        );
        console.log(
          "Response active value:",
          responseData.active,
          "of type:",
          typeof responseData.active
        );
        console.log(
          "Full webhook config response data:",
          JSON.stringify(responseData)
        );

        // Make sure we update the local state with the correct boolean value from the server
        if (responseData.active !== undefined) {
          setIsWebhookActive(Boolean(responseData.active));
        }

        // Update webhook setup state based primarily on active status
        setWebhookSetup((prev) => ({
          ...prev,
          webhookCreated: true, // Mark that the webhook configuration exists in database
          verified: true, // Always assume webhook is verified if it exists in the database
          isSetupComplete: Boolean(responseData.active), // Setup is complete if webhook is active
        }));

        // Set isConfigured based solely on the active status from the database
        // This simplifies the logic and decouples it from webhook verification
        if (Boolean(responseData.active)) {
          console.log("Webhook is active - enabling controls");

          // Check if AI provider is configured
          const aiProviderResponse = await fetch("/api/settings/ai-provider");
          if (aiProviderResponse.ok) {
            const aiProviderData = await aiProviderResponse.json();
            const isAIConfigured =
              aiProviderData.aiProviderSettings &&
              aiProviderData.aiProviderSettings.length > 0;

            if (isAIConfigured) {
              setIsConfigured(true);
              fetchRepositories();
            } else {
              console.log(
                "AI provider not configured - keeping controls disabled"
              );
              setIsConfigured(false);
            }
          }
        } else {
          // If webhook is not active, disable configuration entirely
          console.log("Webhook is not active - disabling controls");
          setIsConfigured(false);
        }
      } else {
        setSaveSuccess(false);
        setIsKeySaved(false);
      }
    } catch (error) {
      console.error("Error saving webhook configuration:", error);
      setSaveSuccess(false);
      setIsKeySaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Adjust textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // Check job status periodically if a job is in progress
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (result.status === "pending" && result.jobId) {
      intervalId = setInterval(() => {
        checkJobStatus(result.jobId as string);
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [result]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (!response.ok) return;

      const data = await response.json();
      if (data.user) {
        setUserLicense(data.user.licenseType);

        // Check if AI provider is configured
        const configResponse = await fetch("/api/settings/ai-provider");
        if (configResponse.ok) {
          const configData = await configResponse.json();
          const isConfiguredValue =
            configData.aiProviderSettings &&
            configData.aiProviderSettings.length > 0;

          setIsConfigured(isConfiguredValue);

          // Store AI provider configuration details if available
          if (isConfiguredValue && configData.aiProviderSettings.length > 0) {
            const providerData = configData.aiProviderSettings[0];
            setAiProviderConfig({
              provider: providerData.provider,
              model: providerData.model,
            });
            console.log(
              `Using AI provider: ${providerData.provider}, model: ${providerData.model}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Function to fetch saved AI agent configuration
  const fetchSavedAgentConfiguration = async () => {
    try {
      console.log(`Fetching AI jobs for project: ${projectId}`);
      const response = await fetch(`/api/projects/${projectId}/ai-jobs`);
      if (!response.ok) {
        console.error("Failed to fetch AI jobs:", response.statusText);
        return;
      }

      const data = await response.json();
      console.log("AI jobs data received:", data);
      if (data.jobs && data.jobs.length > 0) {
        // Find the most recent CONFIGURED job (which contains the saved configuration)
        const configuredJob = data.jobs.find(
          (job) => job.status === "CONFIGURED"
        );
        if (configuredJob) {
          // Set the prompt and repository from the saved configuration
          setPrompt(configuredJob.prompt || "");
          setRepository(configuredJob.repositoryName || "");
          console.log("Loaded saved configuration:", configuredJob);
        }
      }
    } catch (error) {
      console.error("Error fetching saved AI configuration:", error);
    }
  };

  // Function to fetch AI jobs for this project
  const fetchJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const response = await fetch(`/api/projects/${projectId}/ai-jobs`);
      if (!response.ok) {
        console.error("Failed to fetch AI jobs:", response.statusText);
        return;
      }

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching AI jobs:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations:
    if (!webhookSecret) {
      setError("Webhook Secret Key is required to save the configuration.");
      // Consider adding a visual cue or scroll to the secret field
      return;
    }
    if (!repository) {
      setError("Please select a repository.");
      return;
    }
    if (!prompt) {
      setError("Please provide AI Agent Instructions (the prompt).");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult({ status: "idle" }); // Reset previous results

    try {
      const booleanActive =
        isWebhookActive === true ||
        String(isWebhookActive).toLowerCase() === "true" ||
        Number(isWebhookActive) === 1 ||
        String(isWebhookActive) === "1";

      const webhookConfigPayload = {
        secret: webhookSecret,
        active: booleanActive,
        repositoryName: repository, // From the repository dropdown
        agentInstructions: prompt, // From the prompt textarea
        description: webhookDescription, // Preserve existing description
      };

      console.log(
        "Attempting to save ProjectWebhookConfig via Execute AI Agent button:",
        JSON.stringify(webhookConfigPayload)
      );

      const response = await fetch(
        `/api/projects/${projectId}/webhook-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookConfigPayload),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || "Failed to save webhook configuration"
        );
      }

      console.log(
        "Webhook configuration saved successfully via Execute AI Agent button:",
        responseData
      );

      // Update local state with the saved/returned configuration
      setWebhookSecret(responseData.secret || "");
      setIsWebhookActive(Boolean(responseData.active));
      setWebhookDescription(responseData.description || "");
      setWebhookConfig({
        repositoryName: responseData.repositoryName || "",
        agentInstructions: responseData.agentInstructions || "",
      });
      setIsKeySaved(!!responseData.secret);

      // Update webhook setup state based on active field
      setWebhookSetup((prev) => ({
        ...prev,
        webhookCreated: !!responseData.secret,
        verified: true, // Always assume verified if we can save the config
        isSetupComplete: Boolean(responseData.active),
      }));

      if (Boolean(responseData.active)) {
        const aiProviderResponse = await fetch("/api/settings/ai-provider");
        if (aiProviderResponse.ok) {
          const aiProviderData = await aiProviderResponse.json();
          const isAIConfigured =
            aiProviderData.aiProviderSettings &&
            aiProviderData.aiProviderSettings.length > 0;
          if (isAIConfigured) {
            setIsConfigured(true);
            if (adoProjectId) fetchRepositories(); // Re-fetch repos if ADO project ID is available
          }
        }
      } else {
        setIsConfigured(false);
      }

      setResult({
        status: "success",
        message: "Webhook configuration saved successfully!",
      });
    } catch (error) {
      console.error(
        "Error saving webhook configuration via Execute AI Agent button:",
        error
      );
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setResult({
        status: "error",
        message: `Failed to save webhook configuration: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/ai/execute/${jobId}`);
      if (!response.ok) return;

      const data = await response.json();

      if (data.status === "COMPLETED") {
        setResult({
          status: "success",
          jobId,
          message: "AI agent task completed successfully!",
          pullRequestUrl: data.pullRequestUrl,
        });
      } else if (data.status === "FAILED") {
        setResult({
          status: "error",
          jobId,
          message: `AI agent task failed: ${
            data.errorMessage || "Unknown error"
          }`,
        });
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setRepository("");
    setResult({ status: "idle" });
    setError("");
  };

  const testWebhookConnection = async () => {
    setWebhookSetup((prev) => ({
      ...prev,
      isTestingConnection: true,
      testResult: null,
    }));

    try {
      // Call an API endpoint to test the webhook connection
      const response = await fetch("/api/ado/webhook/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Ensure session cookie is sent with the request
          Accept: "application/json",
        },
        // Critical: Include credentials to send cookies with the request
        credentials: "include",
        body: JSON.stringify({
          projectId,
          adoProjectId,
          secret: webhookSecret,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (err) {
        console.error("Error parsing webhook test response:", err);
        data = { error: "Invalid response format" };
      }

      // Log response details for debugging
      console.log(`Webhook test response: ${response.status}`, data);

      const isSuccess = response.ok;

      setWebhookSetup((prev) => ({
        ...prev,
        isTestingConnection: false,
        testResult: {
          success: isSuccess,
          message: isSuccess
            ? "Webhook connection tested successfully!"
            : data.error || data.details || "Failed to connect to webhook",
        },
      }));

      // After successful webhook test, make sure to enable the active status
      if (isSuccess) {
        console.log("Webhook test successful");

        // Mark webhook as verified in the UI
        setWebhookSetup((prev) => ({
          ...prev,
          verified: true, // Keep this for backward compatibility
          isSetupComplete: true,
        }));

        // Only if the webhook is also active, enable the configuration
        if (isWebhookActive) {
          setIsConfigured(true);
          await fetchRepositories();
        }

        // Save the webhook configuration with active status (without changing current active value)
        const saveResponse = await fetch(
          `/api/projects/${projectId}/webhook-config`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              secret: webhookSecret,
              active: isWebhookActive, // Keep current active state
              repositoryName: webhookConfig.repositoryName || "",
              agentInstructions: webhookConfig.agentInstructions || "",
              description: webhookDescription || "",
            }),
          }
        );

        if (saveResponse.ok) {
          console.log("Webhook configuration updated after testing");
        }
      }
    } catch (error) {
      console.error("Error testing webhook connection:", error);
      setWebhookSetup((prev) => ({
        ...prev,
        isTestingConnection: false,
        testResult: {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while testing the webhook",
        },
      }));
    }
  };

  // Start editing webhook config
  const startEditingWebhook = () => {
    // Set initial values from current config
    setEditedAgentInstructions(webhookConfig.agentInstructions || "");
    setEditedRepository(webhookConfig.repositoryName || "");
    setIsEditingWebhook(true);
  };

  // Cancel editing webhook config
  const cancelEditingWebhook = () => {
    setIsEditingWebhook(false);
  };

  // Save edited webhook config
  const saveWebhookEdit = async () => {
    // Validate required fields
    if (!editedRepository) {
      setSaveSuccess(false);
      alert("Please select a repository");
      return;
    }

    setIsSavingEdit(true);
    setSaveSuccess(null);
    try {
      // Ensure we always save active state as a boolean, similar to saveWebhookConfig
      const booleanActive =
        isWebhookActive === true ||
        String(isWebhookActive).toLowerCase() === "true" ||
        Number(isWebhookActive) === 1 ||
        String(isWebhookActive) === "1";

      console.log(
        "Saving webhook edit with active value:",
        booleanActive,
        "original value was:",
        isWebhookActive,
        "type:",
        typeof isWebhookActive
      );

      const response = await fetch(
        `/api/projects/${projectId}/webhook-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            secret: webhookSecret, // Keep existing secret
            active: booleanActive, // Use normalized boolean value
            repositoryName: editedRepository,
            agentInstructions: editedAgentInstructions,
            description: webhookDescription, // Keep the existing description
          }),
        }
      );
      if (response.ok) {
        // Update local state with new values from server response
        const data = await response.json();
        console.log("Webhook edit response:", JSON.stringify(data));

        // Update webhook config with server data
        setWebhookConfig({
          repositoryName: data.repositoryName || editedRepository,
          agentInstructions: data.agentInstructions || editedAgentInstructions,
        });

        // Make sure we update the active state with the boolean from the server
        if (data.active !== undefined) {
          setIsWebhookActive(Boolean(data.active));
        }

        // CRITICAL FIX: Update the webhook secret with the one from the response if present
        // This ensures the secret is preserved across edits
        if (data.secret) {
          setWebhookSecret(data.secret);
        }

        setSaveSuccess(true);
        setIsEditingWebhook(false);
      } else {
        console.error("Failed to update webhook config");
        setSaveSuccess(false);
      }
    } catch (error) {
      console.error("Error updating webhook config:", error);
      setSaveSuccess(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // If not authenticated, show a placeholder
  if (status === "loading" || status === "unauthenticated") {
    return <div className="h-10"></div>;
  }

  return (
    <div className="card-neo dark:bg-background/50 mb-8 overflow-hidden transition-all duration-300">
      {/* Header with expand/collapse functionality - keep existing code */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-accent/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-accent"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-4.8 2.401A4 4 0 1114 10a1 1 0 102 0c0-1.537-.586-3.07-1.757-4.243zM12 10a2 2 0 10-4 0 2 2 0 004 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Agent
          </h2>
          {isConfigured ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-success/20 text-success">
              <svg
                className="h-3 w-3 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Ready
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-warning/20 text-warning">
              Not Configured
            </span>
          )}
        </div>
        <button
          className="text-gray-500 dark:text-gray-400"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* ADO Webhook Setup Instructions */}
          <div className="bg-primary/5 border border-primary/20 rounded-md p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Azure DevOps Webhook Setup
              </h3>
              <div className="flex items-center">
                {isKeySaved ? (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isWebhookActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 mr-1.5 rounded-full ${
                        isWebhookActive ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    ></span>
                    {isWebhookActive ? "Active" : "Inactive"}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                    <span className="w-2 h-2 mr-1.5 rounded-full bg-gray-400"></span>
                    Not Configured
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              To enable automatic AI agent triggers when work items are
              assigned, you need to set up a webhook in Azure DevOps:
            </p>

            {/* Webhook Secret Configuration Form */}
            <div className="space-y-3 mb-4 border border-primary/10 bg-primary/5 p-3 rounded-md">
              <div className="flex flex-col space-y-1">
                <label
                  htmlFor="webhookSecret"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Webhook Secret Key
                </label>
                <div className="flex space-x-2 items-center">
                  <input
                    id="webhookSecret"
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Enter your webhook secret key"
                    className="input-neo flex-grow bg-background/50 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="flex items-center">
                    <input
                      id="isWebhookActive"
                      type="checkbox"
                      checked={isWebhookActive}
                      onChange={(e) => setIsWebhookActive(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isWebhookActive"
                      className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center"
                    >
                      Active
                      <span
                        className={`ml-2 inline-block w-2 h-2 rounded-full ${isWebhookActive ? "bg-green-500" : "bg-gray-400"}`}
                      ></span>
                      <span
                        className={`ml-1 text-xs ${isWebhookActive ? "text-green-600 dark:text-green-500" : "text-gray-500 dark:text-gray-400"}`}
                      >
                        {isWebhookActive ? "(Enabled)" : "(Disabled)"}
                      </span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This secret will be used to validate incoming webhook requests
                  from Azure DevOps
                </p>
                <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <strong>Need a secure key?</strong> You can generate one by
                    running:
                  </p>
                  <code className="block bg-gray-100 dark:bg-gray-900 p-1 rounded text-xs font-mono whitespace-normal break-all">
                    node -e
                    "console.log(require('crypto').randomBytes(32).toString('hex'))"
                  </code>
                  <button
                    onClick={() => {
                      const secret = Array.from(
                        window.crypto.getRandomValues(new Uint8Array(32))
                      )
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                      setWebhookSecret(secret);
                    }}
                    className="mt-2 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1 px-2 rounded"
                  >
                    Generate Secret Key
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={saveWebhookConfig}
                  disabled={isSaving}
                  className={`button-primary-outline text-xs px-3 py-1 ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-3 w-3"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Save Configuration"
                  )}
                </button>
              </div>

              {saveSuccess !== null && (
                <div
                  className={`mt-2 p-2 text-xs rounded ${
                    saveSuccess
                      ? "bg-success/10 text-success border border-success/20"
                      : "bg-error/10 text-error border border-error/20"
                  }`}
                >
                  {saveSuccess
                    ? "Webhook configuration saved successfully!"
                    : "Failed to save webhook configuration. Please try again."}
                </div>
              )}
            </div>

            <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
              <li>Go to your Azure DevOps project settings</li>
              <li>
                Select{" "}
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  Service Hooks
                </span>
              </li>
              <li>
                Click{" "}
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  + Create subscription
                </span>
              </li>
              <li>
                Select{" "}
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  Web Hooks
                </span>{" "}
                as the service
              </li>
              <li>
                Configure trigger:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    Event:{" "}
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      Work item updated
                    </span>
                  </li>
                  <li>
                    Filter:{" "}
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      Assigned To
                    </span>{" "}
                    changed
                  </li>
                </ul>
              </li>
              <li>
                Configure action:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>
                    URL:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded break-all">
                      {window.location.origin}/api/ado/webhook
                    </code>
                  </li>
                  <li>
                    Add header:{" "}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                      x-ado-signature: {webhookSecret || "{your_secret_key}"}
                    </code>
                  </li>
                  <li>
                    The secret key should match the one you configured above
                  </li>
                </ul>
              </li>
            </ol>

            {/* Webhook Configuration Status */}
            <div className="space-y-4 border-t border-primary/20 pt-4">
              {/* Added status view for webhook configuration when it's properly set up */}
              {isKeySaved && webhookSetup.isSetupComplete && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">
                          Status: Configuration found in database
                        </span>
                        {webhookSecret && (
                          <span className="block mt-1">
                            Secret Key: {webhookSecret.substring(0, 8)}...
                            {webhookSecret.substring(webhookSecret.length - 8)}
                          </span>
                        )}
                        <span className="block">
                          Active: {isWebhookActive ? "Yes" : "No"}
                        </span>
                        {webhookDescription && (
                          <span className="block mt-1">
                            <span className="font-medium">Description:</span>{" "}
                            {webhookDescription}
                          </span>
                        )}
                        {!isEditingWebhook && webhookConfig.repositoryName && (
                          <span className="block mt-1">
                            <span className="font-medium">Repository:</span>{" "}
                            {webhookConfig.repositoryName}
                          </span>
                        )}
                        {!isEditingWebhook &&
                          webhookConfig.agentInstructions && (
                            <span className="block mt-1">
                              <span className="font-medium">
                                Agent Instructions:
                              </span>{" "}
                              <span className="block ml-2 text-xs bg-gray-50 dark:bg-gray-900 p-1 rounded border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                                {webhookConfig.agentInstructions.length > 100
                                  ? `${webhookConfig.agentInstructions.substring(0, 100)}...`
                                  : webhookConfig.agentInstructions}
                              </span>
                            </span>
                          )}
                      </p>

                      {!isEditingWebhook && isWebhookActive && (
                        <button
                          onClick={startEditingWebhook}
                          className="mt-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary py-1 px-2 rounded flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit Configuration
                        </button>
                      )}

                      {isEditingWebhook && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Repository
                            </label>
                            <select
                              value={editedRepository}
                              onChange={(e) =>
                                setEditedRepository(e.target.value)
                              }
                              className="input-neo w-full bg-background/50 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="">Select a repository</option>
                              {repositories.map((repo) => (
                                <option key={repo.id} value={repo.name}>
                                  {repo.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Agent Instructions
                            </label>
                            <textarea
                              value={editedAgentInstructions}
                              onChange={(e) =>
                                setEditedAgentInstructions(e.target.value)
                              }
                              className="input-neo w-full bg-background/50 text-gray-900 dark:text-white text-sm min-h-[80px]"
                              placeholder="Enter instructions for the AI agent"
                            />
                            <div className="mt-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-blue-800 dark:text-blue-300 text-xs">
                              <div className="font-medium mb-1 flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1.5"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Tip: To get the best results, make sure your
                                prompt:
                              </div>
                              <ul className="list-disc list-inside space-y-1 ml-1">
                                <li>
                                  Clearly states the goal and desired outcome,
                                  and guides the agent to stay active until your
                                  request is fully resolved.
                                </li>
                                <li>
                                  Encourages the agent to use available tools
                                  (e.g. file readers, code analyzers) when it
                                  isn't certain about your codebase—never guess.
                                </li>
                                <li>
                                  Asks the agent to plan its steps before
                                  calling any functions, and to reflect on each
                                  result before proceeding.
                                </li>
                                <li>
                                  Avoids forcing the agent into a single batch
                                  of function calls—allow it to think, test,
                                  adjust, and iterate through the problem.
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={cancelEditingWebhook}
                              className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1 px-2 rounded"
                              disabled={isSavingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveWebhookEdit}
                              className="text-xs bg-primary hover:bg-primary-dark text-white py-1 px-2 rounded flex items-center"
                              disabled={isSavingEdit}
                            >
                              {isSavingEdit ? (
                                <>
                                  <svg
                                    className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : (
                                "Update Configuration"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div
                        className={`h-2 w-2 rounded-full ${isWebhookActive ? "bg-green-500" : "bg-yellow-500"}`}
                      ></div>
                      <span
                        className={`text-xs font-medium ${isWebhookActive ? "text-green-500" : "text-yellow-500"}`}
                      >
                        {isWebhookActive
                          ? "Connected & Active"
                          : "Connected but Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Added: Toggle for indicating webhook creation */}
              <div className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="webhookCreated"
                    className={`h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-500 rounded dark:bg-gray-800 dark:checked:bg-primary ${
                      !isKeySaved ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    checked={webhookSetup.webhookCreated}
                    onChange={(e) =>
                      setWebhookSetup((prev) => ({
                        ...prev,
                        webhookCreated: e.target.checked,
                        isSetupComplete:
                          e.target.checked && prev.isSetupComplete,
                      }))
                    }
                    disabled={!isKeySaved}
                  />
                  <label
                    htmlFor="webhookCreated"
                    className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${
                      !isKeySaved ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    I have created the webhook in Azure DevOps
                    {!isKeySaved && (
                      <span className="ml-2 text-xs text-amber-500">
                        (Save your secret key first)
                      </span>
                    )}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="webhookSetupComplete"
                    disabled={!webhookSetup.webhookCreated}
                    className={`h-4 w-4 text-primary focus:ring-primary border-gray-300 dark:border-gray-500 rounded dark:bg-gray-800 dark:checked:bg-primary ${
                      !webhookSetup.webhookCreated
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    checked={webhookSetup.isSetupComplete}
                    onChange={(e) =>
                      setWebhookSetup((prev) => ({
                        ...prev,
                        isSetupComplete: e.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="webhookSetupComplete"
                    className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${
                      !webhookSetup.webhookCreated
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    I have completed the webhook setup and it's ready for
                    testing
                  </label>
                </div>
              </div>

              {webhookSecret &&
                webhookSetup.isSetupComplete &&
                !isWebhookActive && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700/30 dark:text-yellow-500">
                    <div className="flex items-start space-x-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-xs">
                        <span className="font-medium">Webhook is inactive</span>
                        <p className="mt-0.5">
                          Enable the webhook by checking the "Active" checkbox
                          above. Inactive webhooks won't trigger AI actions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              <button
                onClick={testWebhookConnection}
                disabled={
                  !webhookSetup.isSetupComplete ||
                  !webhookSetup.webhookCreated ||
                  webhookSetup.isTestingConnection ||
                  !webhookSecret
                }
                title={
                  !webhookSetup.isSetupComplete
                    ? "Please complete webhook setup first"
                    : !webhookSetup.webhookCreated
                      ? "Please create webhook first"
                      : !webhookSecret
                        ? "Webhook secret is required"
                        : !isWebhookActive
                          ? "Warning: Webhook is currently inactive"
                          : "Test the webhook connection"
                }
                className={`text-xs px-3 py-1 ${
                  !webhookSetup.isSetupComplete ||
                  !webhookSetup.webhookCreated ||
                  webhookSetup.isTestingConnection ||
                  !webhookSecret
                    ? "opacity-50 cursor-not-allowed "
                    : ""
                } ${
                  !isWebhookActive &&
                  webhookSecret &&
                  webhookSetup.isSetupComplete
                    ? "button-warning-outline"
                    : "button-primary-outline"
                }`}
              >
                {webhookSetup.isTestingConnection ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Testing...
                  </span>
                ) : (
                  "Test Webhook Connection"
                )}
              </button>
            </div>

            {webhookSetup.testResult && (
              <div
                className={`mt-3 p-2 text-sm rounded ${
                  webhookSetup.testResult.success
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-error/10 text-error border border-error/20"
                }`}
              >
                {webhookSetup.testResult.message}
              </div>
            )}
          </div>

          {/* Rest of the component remains the same */}
          {!isConfigured ? (
            <div className="bg-warning/10 border border-warning/30 text-warning p-3 rounded-md text-sm">
              <p className="mb-2 font-medium">AI Provider Not Configured</p>
              <p>
                Please configure your AI provider in the Settings page before
                using the AI Agent.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center mt-2 text-warning underline hover:text-warning/80"
              >
                Go to Settings
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          ) : result.status === "success" ? (
            <div className="bg-success/10 border border-success/30 text-success p-4 rounded-md">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 mr-2 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-medium">Success!</h3>
                  <p className="mt-1">{result.message}</p>
                  {result.pullRequestUrl && (
                    <a
                      href={result.pullRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 underline"
                    >
                      View Pull Request
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    className="mt-3 button-neo text-xs py-1 px-2"
                  >
                    Start New Request
                  </button>
                </div>
              </div>
            </div>
          ) : result.status === "error" ? (
            <div className="bg-error/10 border border-error/30 text-error p-4 rounded-md">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 mr-2 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="font-medium">Error</h3>
                  <p className="mt-1">{result.message}</p>
                  <button
                    onClick={handleReset}
                    className="mt-3 button-neo text-xs py-1 px-2"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : result.status === "pending" ? (
            <div className="bg-primary/10 border border-primary/30 text-primary p-4 rounded-md">
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>
                  Processing your request... This may take a few minutes.
                </span>
              </div>
            </div>
          ) : (
            <div>
              {/* Webhook status banners - updated to use isWebhookActive as the primary control */}
              {isWebhookActive && (
                <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-md text-success">
                  <div className="flex items-start space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mt-0.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">Webhook active</p>
                      <p className="text-sm mt-1">
                        Your webhook is active and ready to use with the AI
                        Agent.
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-green-500">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isWebhookActive && webhookSecret && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700/30 dark:text-yellow-500">
                  <div className="flex items-start space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mt-0.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="font-medium">
                        Webhook is configured but inactive
                      </p>
                      <p className="text-sm mt-1">
                        Your webhook is configured but currently inactive.
                        Toggle the "Active" checkbox in the webhook
                        configuration section to activate it and enable AI Agent
                        functionality.
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                        <span className="text-xs font-medium text-yellow-500">
                          Inactive
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium ${!isConfigured ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"} mb-1`}
                  >
                    Repository
                  </label>
                  <select
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    className={`input-neo w-full ${!isConfigured ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60" : "bg-background/50"} text-gray-900 dark:text-white`}
                    disabled={!isConfigured}
                  >
                    <option value="">Select a repository</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.name}>
                        {repo.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium ${!isConfigured ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-white"} mb-1`}
                  >
                    What would you like the AI agent to do?
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      isConfigured
                        ? "Describe what changes you want the AI to make to the codebase. Be as specific as possible."
                        : "Please verify your webhook connection first."
                    }
                    className={`input-neo w-full ${!isConfigured ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60" : "bg-background/50"} text-gray-900 dark:text-white min-h-[100px] resize-none`}
                    disabled={!isConfigured}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Example: "Create a new API endpoint that returns user
                    statistics" or "Refactor the authentication service to use
                    JWT tokens instead of cookies"
                  </p>
                </div>

                {error && (
                  <div className="bg-error/10 border border-error/30 text-error p-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="button-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !prompt ||
                      !repository ||
                      !isConfigured ||
                      !isWebhookActive
                    }
                    title={
                      !prompt
                        ? "Please enter a prompt"
                        : !repository
                          ? "Please select a repository"
                          : !isConfigured
                            ? "AI provider not configured"
                            : !isWebhookActive
                              ? "Webhook is not active - enable it in the webhook configuration"
                              : "Execute AI Agent"
                    }
                    className={`button-primary text-sm ${
                      isLoading ||
                      !prompt ||
                      !repository ||
                      !isConfigured ||
                      !isWebhookActive
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "Execute AI Agent"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
