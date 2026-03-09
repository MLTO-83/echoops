"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface AIJob {
  id: string;
  prompt: string;
  repositoryName: string;
  status: string;
  adoWorkItemId?: string;
  adoWorkItemTitle?: string;
  pullRequestUrl?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface AIProgressSectionProps {
  projectId: string;
}

export default function AIProgressSection({
  projectId,
}: AIProgressSectionProps) {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isWebhookActive, setIsWebhookActive] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [retryingJobs, setRetryingJobs] = useState<Set<string>>(new Set());

  // Fetch webhook configuration
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        // Check webhook configuration
        const webhookResponse = await fetch(
          `/api/projects/${projectId}/webhook-config`
        );

        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          console.log("Webhook config data:", JSON.stringify(webhookData));

          // Determine whether we have a direct webhook config object or nested webhookConfig property
          // This handles both response formats that might exist in different environments
          const webhookConfigData = webhookData.webhookConfig || webhookData;

          // Log detailed structure for debugging
          console.log(
            "webhookConfig structure:",
            JSON.stringify({
              exists: !!webhookConfigData,
              activeValue: webhookConfigData?.active,
              activeType: typeof webhookConfigData?.active,
            })
          );

          // Enhanced logic to handle multiple active value formats
          const activeValue = webhookConfigData?.active;
          const isWebhookActive =
            activeValue === true ||
            String(activeValue).toLowerCase() === "true" ||
            Number(activeValue) === 1 ||
            String(activeValue) === "1";

          console.log("isWebhookActive:", isWebhookActive);

          // Only check if webhook is active
          setIsWebhookActive(isWebhookActive);
          console.log("Final isWebhookActive state:", isWebhookActive);
        }
      } catch (error) {
        console.error("Error checking configuration:", error);
        setIsWebhookActive(false);
      }
    };

    checkConfiguration();
  }, [projectId]);

  // Fetch AI jobs for the current project
  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/ai-jobs`);

      if (response.ok) {
        const data = await response.json();
        console.log("AI Jobs API Response:", data); // Debug log to see what jobs we're getting

        // Check if there are any non-CONFIGURED jobs
        const hasActiveJobs = data.jobs?.some(
          (job) => job.status !== "CONFIGURED"
        );

        // If we have active jobs, filter out the CONFIGURED ones (which are just placeholders)
        // Otherwise, show the CONFIGURED job as a placeholder
        const filteredJobs = hasActiveJobs
          ? data.jobs.filter((job) => job.status !== "CONFIGURED")
          : data.jobs;

        console.log("Filtered jobs for display:", filteredJobs); // Debug what we're actually showing
        setJobs(filteredJobs || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load AI jobs");
      }
    } catch (error) {
      console.error("Error fetching AI jobs:", error);
      setError("Failed to load AI jobs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Set up periodic refresh of job data
  useEffect(() => {
    if (isWebhookActive) {
      fetchJobs();

      // Refresh job data every 5 minutes (300,000 ms) instead of 30 seconds
      const interval = setInterval(fetchJobs, 300000);
      setRefreshInterval(interval);

      return () => {
        if (refreshInterval) clearInterval(refreshInterval);
      };
    }
  }, [isWebhookActive, projectId]);

  // Format job status for display
  const formatJobStatus = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "Waiting";
      case "IN_PROGRESS":
        return "Processing";
      case "PROCESSING":
        return "Processing";
      case "COMPLETED":
        return "Completed";
      case "FAILED":
        return "Failed";
      case "CONFIGURED":
        return "Configured (Waiting)";
      default:
        return status;
    }
  };

  // Retry a failed job
  const retryJob = async (jobId: string) => {
    try {
      // Mark as retrying to show spinner
      setRetryingJobs((prev) => new Set([...prev, jobId]));

      const response = await fetch(`/api/projects/${projectId}/ai-jobs/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });

      if (response.ok) {
        // Refresh jobs list to show updated status
        fetchJobs();
      } else {
        const errorData = await response.json();
        console.error("Error retrying job:", errorData.error);
        alert(`Failed to retry job: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error retrying job:", error);
      alert(`Failed to retry job: ${error.message || "Unknown error"}`);
    } finally {
      // Remove from retrying state regardless of outcome
      setRetryingJobs((prev) => {
        const newSet = new Set([...prev]);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "IN_PROGRESS":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "PROCESSING":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "COMPLETED":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "FAILED":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "CONFIGURED":
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  // If webhook is not active, don't render anything
  if (!isWebhookActive) {
    return null;
  }

  return (
    <div className="card-neo bg-background/50 p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Agent Progress
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Track the status of work items assigned to the AI agent
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="button-neo text-sm border-primary/80 dark:border-primary/80 flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-700 dark:text-gray-300">
            Loading jobs...
          </span>
        </div>
      ) : error ? (
        <div className="bg-error/10 border border-error/30 text-error p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-background-secondary/10 p-4 rounded-md text-center">
          <p className="text-gray-700 dark:text-gray-300">
            No active AI jobs found. Assign a work item to the AI agent to get
            started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Work Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Repository
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {job.adoWorkItemTitle || "Untitled Work Item"}
                      </div>
                      {job.adoWorkItemId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {job.adoWorkItemId}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {job.repositoryName}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}
                    >
                      {formatJobStatus(job.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(job.updatedAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {job.status === "FAILED" && (
                        <button
                          onClick={() => retryJob(job.id)}
                          disabled={retryingJobs.has(job.id)}
                          className="text-primary hover:text-primary-dark inline-flex items-center"
                          title="Retry job"
                        >
                          {retryingJobs.has(job.id) ? (
                            <>
                              <span>Retrying...</span>
                              <svg
                                className="animate-spin h-4 w-4 ml-1"
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
                            </>
                          ) : (
                            <>
                              <span>Retry</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 ml-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                            </>
                          )}
                        </button>
                      )}

                      {job.pullRequestUrl ? (
                        <a
                          href={job.pullRequestUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-dark inline-flex items-center"
                        >
                          <span>View PR</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      ) : job.errorMessage ? (
                        <div className="inline-flex group relative">
                          <button className="text-error hover:text-error-dark inline-flex items-center">
                            <span>Error Details</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 ml-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </button>
                          <div className="absolute hidden group-hover:block bg-white dark:bg-gray-800 p-2 rounded shadow-lg z-10 right-0 w-64 text-left text-xs text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                            {job.errorMessage}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
