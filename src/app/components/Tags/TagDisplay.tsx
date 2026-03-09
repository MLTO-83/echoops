"use client";

import { useState, useEffect, useRef } from "react";
// Remove the problematic import and define our own interface based on the Prisma schema
interface ProgramType {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
import TagSelector from "./TagSelector";

interface TagDisplayProps {
  projectId: string;
  className?: string;
  compact?: boolean;
  onErrorAction?: (error: string) => void;
}

export default function TagDisplay({
  projectId,
  className = "",
  compact = false,
  onErrorAction,
}: TagDisplayProps) {
  const [tags, setTags] = useState<ProgramType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const tagContainerRef = useRef<HTMLDivElement>(null);

  // Keep track if component is mounted
  const isMounted = useRef<boolean>(false);
  // Cache the previously fetched tags by project ID
  const tagsCache = useRef<{ [key: string]: ProgramType[] }>({});

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);

      // If we have cached tags for this project, use them immediately
      if (tagsCache.current[projectId]) {
        setTags(tagsCache.current[projectId]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/projects/${projectId}/tags`, {
          // Prevent caching
          cache: "no-store",
          headers: {
            pragma: "no-cache",
            "cache-control": "no-cache",
          },
        });

        if (!response.ok) {
          // Extract error information from response if possible
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to parse error response" }));
          throw new Error(
            errorData.error || `Error ${response.status}: Failed to fetch tags`
          );
        }

        const data = await response.json();
        // Cache the tags
        tagsCache.current[projectId] = data.tags || [];
        if (isMounted.current) {
          setTags(data.tags || []);
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load tags";
        setError(errorMessage);
        if (onErrorAction) onErrorAction(errorMessage);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    // Set mounted flag
    isMounted.current = true;
    fetchTags();

    // Clean up
    return () => {
      isMounted.current = false;
    };
  }, [projectId, retryCount, onErrorAction]);

  // Subscribe to tag changes from TagSelector
  useEffect(() => {
    const handleTagChange = (event: CustomEvent) => {
      const { projectId: eventProjectId, tags: newTags } = event.detail;

      // Only update if it's for our project
      if (eventProjectId === projectId) {
        // Update cache
        tagsCache.current[projectId] = newTags;
        setTags(newTags);
      }
    };

    // Add custom event listener for tag updates
    window.addEventListener("tags-updated", handleTagChange as EventListener);

    return () => {
      window.removeEventListener(
        "tags-updated",
        handleTagChange as EventListener
      );
    };
  }, [projectId]);

  // Close the tag selector when clicking outside
  useEffect(() => {
    if (!isEditing) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleTagError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Function to start editing tags
  const handleStartEditing = () => {
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span className="text-xs text-foreground/70">Loading tags...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-error/90">Failed to load tags</span>
          <button
            onClick={handleRetry}
            className="text-xs text-primary hover:text-primary/80"
            title="Try again"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={tagContainerRef} className={`relative ${className} group`}>
      <div
        onClick={handleStartEditing}
        className={`
          bg-background/50 p-3 rounded-md transition-all duration-200
          border ${tags.length === 0 ? "border-dashed" : "border-solid"} 
          border-primary/30 hover:border-primary/60 hover:shadow-sm
          cursor-pointer group-hover:bg-background/80
          flex items-center min-h-[44px] select-none
        `}
        role="button"
        tabIndex={0}
        title="Click to edit tags"
        aria-label="Edit tags"
      >
        {tags.length === 0 ? (
          <span className="text-sm text-primary/70 italic flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Click to add tags
          </span>
        ) : (
          <div className="flex flex-wrap gap-1 w-full">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className={`inline-block rounded-full 
                  ${
                    compact
                      ? "px-1.5 py-0.5 text-[10px]"
                      : "px-2 py-0.5 text-xs"
                  }
                  bg-primary/10 text-primary border border-primary/30 group-hover:bg-primary/20
                `}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {isEditing && (
        <div
          ref={popoverRef}
          className="absolute z-50 top-full right-0 mt-1 w-64 bg-background shadow-lg rounded-md border border-border overflow-hidden"
        >
          <TagSelector
            projectId={projectId}
            compact={true}
            onCloseAction={() => setIsEditing(false)}
            onErrorAction={handleTagError}
          />
        </div>
      )}
    </div>
  );
}
