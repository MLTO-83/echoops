"use client";

import { useSession } from "@/app/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ADO settings state
  const [adoUrl, setAdoUrl] = useState("");
  const [pat, setPat] = useState("");
  const [orgName, setOrgName] = useState("");
  const [adoLoading, setAdoLoading] = useState(false);
  const [adoMessage, setAdoMessage] = useState<string | null>(null);
  const [adoFetching, setAdoFetching] = useState(true);
  const [adoConfigured, setAdoConfigured] = useState(false);
  const [adoVerified, setAdoVerified] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // AI provider settings state
  const [aiProvider, setAiProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiFetching, setAiFetching] = useState(true);
  const [aiVerified, setAiVerified] = useState(false);

  // AI test state
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestPrompt, setAiTestPrompt] = useState(
    "What is the meaning of 42?"
  );
  const [aiTestResponse, setAiTestResponse] = useState<string | null>(null);

  // AI Agent user selection state
  const [agentUsers, setAgentUsers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [agentUserId, setAgentUserId] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);

  // Hover state for card animations
  const [isHovering, setIsHovering] = useState(-1);

  // Redirect unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Load existing settings
  useEffect(() => {
    if (status !== "authenticated") return;

    // Debug logging - show the session data
    console.log("Session data:", session);

    // Fetch both ADO settings and organization details in parallel
    const fetchAllSettings = async () => {
      setAdoFetching(true);
      try {
        // Fetch organization details first
        console.log("Fetching organization and ADO details...");

        // Get organization details - this endpoint queries the organization
        // by the user's organizationId from the database
        const orgResponse = await fetch("/api/settings/organization", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          console.log("Organization data (raw):", orgData);

          // Set organization name directly from the organization model in the database
          if (orgData && orgData.name) {
            console.log(
              "Setting organization name from database:",
              orgData.name
            );
            setOrgName(orgData.name);
          } else {
            console.log("No organization name found in database");
            // No fallback logic - we will only use actual organization names from the database
            setOrgName("");
          }
        } else {
          console.error(
            "Failed to fetch organization details:",
            await orgResponse.text()
          );
        }

        // Get ADO settings
        const adoResponse = await fetch("/api/settings/ado", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (adoResponse.ok) {
          const adoData = await adoResponse.json();
          console.log("ADO settings data (raw):", adoData);

          // Set ADO URL and PAT
          setAdoUrl(adoData.adoOrganizationUrl || "");

          // Instead of directly setting PAT from response, check if patConfigured is true
          // and use a placeholder value if it is
          if (adoData.patConfigured) {
            setPat("************"); // Show placeholder for security
          } else {
            setPat(""); // No PAT configured
          }

          setAdoConfigured(
            !!(adoData.adoOrganizationUrl && adoData.patConfigured)
          );

          // Keep track of the organizational ID for verification
          if (adoData.organizationId) {
            setOrganizationId(adoData.organizationId);
            setAdoVerified(true);
          }
        } else {
          console.error(
            "Failed to fetch ADO settings:",
            await adoResponse.text()
          );
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setAdoFetching(false);
      }
    };

    // Execute the fetch function
    fetchAllSettings();

    // Fetch AI provider settings
    fetch("/api/settings/ai-provider").then(async (res) => {
      setAiFetching(true);
      try {
        if (res.ok) {
          const { aiProviderSettings } = await res.json();
          if (aiProviderSettings.length > 0) {
            const cfg = aiProviderSettings[0];
            setAiProvider(cfg.provider);
            setApiKey(cfg.apiKey);
            setModel(cfg.model);
            setTemperature(cfg.temperature);
            setMaxTokens(cfg.maxTokens || maxTokens);
            setAiConfigured(true);

            // Consider it verified if we have mandatory fields
            if (cfg.provider && cfg.apiKey && cfg.model) {
              setAiVerified(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching AI provider settings:", error);
      } finally {
        setAiFetching(false);
      }
    });

    // Fetch AI agent settings
    fetch("/api/settings/ai-agent").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAgentUsers(data.users || []);
        setAgentUserId(data.activeAgentUserId || "");
      }
    });
  }, [status]);

  // Verify ADO connection
  const verifyAdoConnection = async () => {
    if (!adoUrl || !pat) return;

    setAdoLoading(true);
    setAdoMessage(null);
    try {
      const res = await fetch("/api/settings/verify-ado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adoOrganizationUrl: adoUrl,
          pat,
        }),
      });

      if (!res.ok) throw new Error("Connection verification failed");

      const data = await res.json();
      if (data.success) {
        setAdoVerified(true);
        setAdoMessage("Azure DevOps connection verified successfully!");
      } else {
        throw new Error(data.message || "Unable to connect to Azure DevOps");
      }
    } catch (err) {
      setAdoVerified(false);
      setAdoMessage(err instanceof Error ? err.message : "Connection error");
    } finally {
      setAdoLoading(false);
    }
  };

  const saveAdo = async () => {
    setAdoLoading(true);
    setAdoMessage(null);
    try {
      const res = await fetch("/api/settings/ado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adoOrganizationUrl: adoUrl,
          pat,
          organizationName: orgName,
        }),
      });
      if (!res.ok) throw new Error("Failed to save ADO settings");
      const data = await res.json();
      setOrganizationId(data.organizationId || null);
      setAdoConfigured(true);
      setAdoMessage("Saved ADO configuration successfully.");

      // Verify the connection after saving
      await verifyAdoConnection();
    } catch (err) {
      setAdoMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setAdoLoading(false);
    }
  };

  const saveAi = async () => {
    if (!aiProvider) return;
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/settings/ai-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          apiKey,
          model,
          temperature,
          maxTokens,
        }),
      });
      if (!res.ok) throw new Error("Failed to save AI settings");
      setAiMessage("Saved AI provider settings successfully.");
    } catch (err) {
      setAiMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setAiLoading(false);
    }
  };

  // Test AI provider with a prompt
  const testAiProvider = async () => {
    if (!aiTestPrompt) return;

    setAiTestLoading(true);
    setAiTestResponse(null);

    try {
      const res = await fetch("/api/settings/test-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiTestPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok && data.error) {
        throw new Error(data.error);
      }

      // Special case for when organization is created but settings are needed
      if (data.needsConfig) {
        setAiTestResponse(
          data.message || "AI provider configuration is needed before testing."
        );

        // If settings page data needs to be refreshed due to organization creation
        if (data.success && !aiProvider) {
          // Refresh page after a short delay to update session data
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else if (data.message) {
        setAiTestResponse(data.message);
      } else if (data.error) {
        setAiTestResponse(`Error: ${data.error}`);
      } else {
        setAiTestResponse("Received response with no message content");
      }
    } catch (err) {
      setAiTestResponse(
        `Error: ${
          err instanceof Error ? err.message : "Failed to test AI provider"
        }`
      );
    } finally {
      setAiTestLoading(false);
    }
  };

  const saveAgentUser = async () => {
    if (!agentUserId) return;
    setAgentLoading(true);
    setAgentMessage(null);
    try {
      const res = await fetch("/api/settings/ai-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: agentUserId }),
      });
      if (!res.ok) throw new Error("Failed to save AI agent user");
      setAgentMessage("Saved AI Agent user successfully.");
    } catch (err) {
      setAgentMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setAgentLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center card-spatial animate-pulse">
          <h1 className="font-display font-bold text-4xl mb-4 relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Loading...
            </span>
          </h1>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6 md:p-12">
      {/* Floating decoration elements */}
      <div className="fixed top-20 left-10 w-20 h-20 bg-primary/20 rounded-full animate-float blur-xl"></div>
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full animate-pulse-slow blur-xl"></div>

      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight relative z-10">
              Settings
            </h1>
            <p className="text-gray-800 dark:text-white max-w-lg">
              Configure your organization and integration preferences
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Component */}
            <div className="flex items-center gap-2 p-2 bg-background-secondary/20 rounded-lg">
              <span className="text-sm text-gray-800 dark:text-white">
                Theme:
              </span>
              <ThemeToggle />
            </div>

            <Link
              href="/dashboard"
              className="button-neo inline-flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* ADO Configuration */}
        <div
          className={`card-neo group transition-all duration-300 ease-out p-8 relative overflow-hidden
                     ${
                       isHovering === 0
                         ? "transform -translate-y-2 shadow-neo-hover dark:shadow-neo-white-hover"
                         : "shadow-neo dark:shadow-neo-white"
                     }`}
          onMouseEnter={() => setIsHovering(0)}
          onMouseLeave={() => setIsHovering(-1)}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2 group-hover:translate-x-8 transition-all duration-700"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                Azure DevOps Integration
              </h2>

              {adoFetching ? (
                <div className="flex items-center space-x-2 mt-2 md:mt-0">
                  <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Loading configuration...
                  </span>
                </div>
              ) : adoConfigured ? (
                <div className="flex items-center mt-2 md:mt-0 space-x-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      adoVerified ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium">
                    {adoVerified ? "Connected" : "Configured (Unverified)"}
                  </span>
                </div>
              ) : null}
            </div>

            {adoConfigured && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Status:</span> Configuration
                  found in database
                  {organizationId && (
                    <span className="block mt-1">
                      Organization ID: {organizationId}
                    </span>
                  )}
                  {orgName && (
                    <span className="block">Organization Name: {orgName}</span>
                  )}
                  {adoUrl && (
                    <span className="block">Organization URL: {adoUrl}</span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Organization Name
                </span>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your organization name"
                  className="input-neo"
                />
                {orgName && orgName.includes("-") && /\d+$/.test(orgName) && (
                  <p className="text-orange-500 dark:text-orange-400 text-xs mt-1">
                    Your organization name appears to be a username. Consider
                    changing it to your actual organization name.
                  </p>
                )}
              </label>
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Organization URL
                </span>
                <input
                  type="text"
                  value={adoUrl}
                  onChange={(e) => setAdoUrl(e.target.value)}
                  placeholder="https://dev.azure.com/your-organization"
                  className="input-neo"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Personal Access Token (PAT)
                </span>
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  placeholder="Your PAT token"
                  className="input-neo"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {pat
                    ? "PAT is set" + (adoConfigured ? " and saved" : "")
                    : "No PAT configured"}
                </span>
              </label>
              {adoMessage && (
                <div
                  className={`text-sm p-2 rounded ${
                    adoMessage.toLowerCase().includes("success") ||
                    adoMessage.toLowerCase().includes("verified")
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {adoMessage}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={saveAdo}
                  disabled={adoLoading || (!adoUrl && !pat && !orgName)}
                  className="button-primary inline-flex items-center group"
                >
                  <span>{adoLoading ? "Saving..." : "Save Settings"}</span>
                  {!adoLoading && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                <button
                  onClick={verifyAdoConnection}
                  disabled={adoLoading || !adoUrl || !pat}
                  className="button-secondary inline-flex items-center group"
                >
                  <span>Verify Connection</span>
                  {!adoLoading && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Provider Configuration */}
        <div
          className={`card-neo group transition-all duration-300 ease-out p-8 relative overflow-hidden
                     ${
                       isHovering === 1
                         ? "transform -translate-y-2 shadow-neo-hover dark:shadow-neo-white-hover"
                         : "shadow-neo dark:shadow-neo-white"
                     }`}
          onMouseEnter={() => setIsHovering(1)}
          onMouseLeave={() => setIsHovering(-1)}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2 group-hover:translate-x-8 transition-all duration-700"></div>

          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                AI Provider Configuration
              </h2>

              {aiFetching ? (
                <div className="flex items-center space-x-2 mt-2 md:mt-0">
                  <div className="animate-spin h-4 w-4 border-2 border-accent rounded-full border-t-transparent"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Loading configuration...
                  </span>
                </div>
              ) : aiConfigured ? (
                <div className="flex items-center mt-2 md:mt-0 space-x-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      aiVerified ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium">
                    {aiVerified ? "Connected" : "Configured (Unverified)"}
                  </span>
                </div>
              ) : null}
            </div>

            {aiConfigured && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Status:</span> Configuration
                  found in database
                  {aiProvider && (
                    <span className="block mt-1">Provider: {aiProvider}</span>
                  )}
                  {model && <span className="block">Model: {model}</span>}
                  {temperature !== undefined && (
                    <span className="block">Temperature: {temperature}</span>
                  )}
                  {maxTokens !== undefined && (
                    <span className="block">Max Tokens: {maxTokens}</span>
                  )}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Provider
                </span>
                <input
                  type="text"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  placeholder="e.g., openai"
                  className="input-neo"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  API Key
                </span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-neo"
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Model
                </span>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g., gpt-4"
                  className="input-neo"
                />
              </label>
              <div className="flex gap-4">
                <label className="flex flex-col flex-1">
                  <span className="text-gray-800 dark:text-white mb-1">
                    Temperature
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="input-neo"
                  />
                </label>
                <label className="flex flex-col flex-1">
                  <span className="text-gray-800 dark:text-white mb-1">
                    Max Tokens
                  </span>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                    className="input-neo"
                  />
                </label>
              </div>
              {aiMessage && <p className="text-sm text-accent">{aiMessage}</p>}
              <button
                onClick={saveAi}
                disabled={aiLoading}
                className="button-accent inline-flex items-center group"
              >
                <span>{aiLoading ? "Saving..." : "Save AI Settings"}</span>
                {!aiLoading && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              {/* AI Test Section */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Test AI Provider
                </h3>
                <div className="space-y-4">
                  <label className="flex flex-col">
                    <span className="text-gray-800 dark:text-white mb-1">
                      Test Prompt
                    </span>
                    <input
                      type="text"
                      value={aiTestPrompt}
                      onChange={(e) => setAiTestPrompt(e.target.value)}
                      placeholder="What is the meaning of 42?"
                      className="input-neo"
                    />
                  </label>

                  {aiTestResponse && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {aiTestResponse}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={testAiProvider}
                    disabled={aiTestLoading || !aiProvider}
                    className="button-accent-outline inline-flex items-center group"
                  >
                    <span>
                      {aiTestLoading ? (
                        <span className="inline-flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-accent"
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
                        "Test AI Provider"
                      )}
                    </span>
                    {!aiTestLoading && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 ml-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Agent User Selection */}
        <div
          className={`card-neo group transition-all duration-300 ease-out p-8 relative overflow-hidden
                     ${
                       isHovering === 2
                         ? "transform -translate-y-2 shadow-neo-hover dark:shadow-neo-white-hover"
                         : "shadow-neo dark:shadow-neo-white"
                     }`}
          onMouseEnter={() => setIsHovering(2)}
          onMouseLeave={() => setIsHovering(-1)}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-xl transform translate-x-12 -translate-y-1/2 group-hover:translate-x-8 transition-all duration-700"></div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-4">
              AI Agent User
            </h2>
            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-gray-800 dark:text-white mb-1">
                  Select agent user
                </span>
                <select
                  value={agentUserId}
                  onChange={(e) => setAgentUserId(e.target.value)}
                  className="input-neo w-full"
                >
                  <option value="">-- Select User --</option>
                  {agentUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </label>
              {agentMessage && (
                <p className="text-sm text-secondary">{agentMessage}</p>
              )}
              <button
                onClick={saveAgentUser}
                disabled={agentLoading}
                className="button-secondary inline-flex items-center group"
              >
                <span>{agentLoading ? "Saving..." : "Save AI Agent User"}</span>
                {!agentLoading && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
