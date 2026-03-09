"use client";

import { useState, useEffect, useRef } from "react";
type ProgramType = {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
};

interface TagSelectorProps {
  projectId: string;
  compact?: boolean;
  onCloseAction?: () => void;
  onErrorAction?: (error: string) => void;
}

export default function TagSelector({
  projectId,
  compact = false,
  onCloseAction,
  onErrorAction,
}: TagSelectorProps) {
  const [tags, setTags] = useState<ProgramType[]>([]);
  const [newTagName, setNewTagName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [availableTags, setAvailableTags] = useState<ProgramType[]>([]);
  const [filteredTags, setFilteredTags] = useState<ProgramType[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState<boolean>(false);

  // Store shared tag cache
  const tagsCache = useRef<{
    availableTags: ProgramType[];
    projectTags: { [key: string]: ProgramType[] };
    lastFetch: number;
  }>({
    availableTags: [],
    projectTags: {},
    lastFetch: 0,
  });

  // Check if still mounted
  const isMounted = useRef<boolean>(false);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);

    // Check if we already have cached tags for this project
    if (tagsCache.current.projectTags[projectId]) {
      setTags(tagsCache.current.projectTags[projectId]);
      setIsLoading(false);
      return;
    }

    try {
      // Make sure projectId is properly encoded for URL use
      const encodedProjectId = encodeURIComponent(projectId);
      const response = await fetch(`/api/projects/${encodedProjectId}/tags`, {
        // Adding cache control to prevent stale data
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

      // Update cache
      tagsCache.current.projectTags[projectId] = data.tags || [];

      // Only update state if component is still mounted
      if (isMounted.current) {
        setTags(data.tags || []);
        setIsLoading(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load tags";
      setError(errorMessage);
      if (onErrorAction) onErrorAction(errorMessage);
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const fetchAllAvailableTags = async () => {
    // Check if we have recent cached tags (less than 30 seconds old)
    const now = Date.now();
    if (
      tagsCache.current.availableTags.length > 0 &&
      now - tagsCache.current.lastFetch < 30000
    ) {
      return tagsCache.current.availableTags;
    }

    try {
      const response = await fetch(`/api/projects/tags`, {
        cache: "no-store",
        headers: {
          pragma: "no-cache",
          "cache-control": "no-cache",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch available tags", response.status);
        return tagsCache.current.availableTags.length > 0
          ? tagsCache.current.availableTags
          : [];
      }

      const data = await response.json();
      const programTypes = data.programTypes || [];

      // Update cache
      tagsCache.current.availableTags = programTypes;
      tagsCache.current.lastFetch = now;

      return programTypes;
    } catch (error) {
      console.error("Error fetching available tags:", error);
      // Return existing cache on error or empty array
      return tagsCache.current.availableTags.length > 0
        ? tagsCache.current.availableTags
        : [];
    }
  };

  // Emit tags changed event
  const broadcastTagsChange = (newTags: ProgramType[]) => {
    // Update cache
    tagsCache.current.projectTags[projectId] = newTags;

    // Broadcast the change using a custom event
    try {
      const event = new CustomEvent("tags-updated", {
        detail: {
          projectId,
          tags: newTags,
        },
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error("Error broadcasting tag change:", err);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchTags();

    // Load all available tags when component mounts
    const loadAvailableTags = async () => {
      const result = await fetchAllAvailableTags();
      if (result) {
        console.log("Setting available tags:", result.length);
        setAvailableTags(result);
      }
    };

    loadAvailableTags();

    // Focus the input field when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Handle click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".tag-dropdown")
      ) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      isMounted.current = false;
    };
  }, [projectId]);

  // Filter available tags based on input
  useEffect(() => {
    // Show all available tags that aren't already associated when input is focused
    // but the field is empty - this helps discovery
    const filtered = availableTags.filter((tag) => {
      // Skip tags that are already associated with the project
      const alreadyAssociated = tags.some((t) => t.id === tag.id);
      if (alreadyAssociated) return false;

      // If there's text entered, filter by it; otherwise show all available tags
      return (
        newTagName.trim() === "" ||
        tag.name.toLowerCase().includes(newTagName.toLowerCase())
      );
    });

    console.log(
      "Filtered tags:",
      filtered.length,
      "from",
      availableTags.length
    );

    setFilteredTags(filtered);
  }, [newTagName, availableTags, tags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTagName(e.target.value);
    setShowTagDropdown(true); // Always show dropdown when typing
  };

  const handleInputFocus = () => {
    // When input is focused, show the dropdown with all available tags
    setShowTagDropdown(true);
  };

  const selectExistingTag = async (tag: ProgramType) => {
    // Check if this tag is already associated with the project
    const isTagAlreadyAssociated = tags.some((t) => t.id === tag.id);

    if (!isTagAlreadyAssociated) {
      setIsSaving(true);
      setError(null);

      try {
        // Encode projectId to handle special characters in URLs
        const encodedProjectId = encodeURIComponent(projectId);

        // Associate the tag with the project
        const response = await fetch(`/api/projects/${encodedProjectId}/tags`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tagIds: [...tags.map((t) => t.id), tag.id],
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Failed to parse error response" }));

          throw new Error(
            errorData.error ||
              `Error ${response.status}: Failed to associate tag with project`
          );
        }

        // Update tags locally instead of refetching
        const newTags = [...tags, tag];
        setTags(newTags);
        broadcastTagsChange(newTags);
        setNewTagName("");
        setShowTagDropdown(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add tag";
        setError(errorMessage);
        if (onErrorAction) onErrorAction(errorMessage);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const createTag = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newTagName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      // First, check if the tag already exists in the available tags
      const allTags = await fetchAllAvailableTags();
      const tagName = newTagName.trim();
      const existingTag = allTags?.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );

      let tagToUse;

      if (existingTag) {
        // If tag already exists, use it instead of creating a new one
        tagToUse = existingTag;
      } else {
        // Create a new tag if it doesn't exist
        const response = await fetch(`/api/projects/tags`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: tagName,
          }),
        });

        if (!response.ok) {
          // If we get a conflict, it means the tag was created in the meantime
          // Try to fetch all tags again to find it
          if (response.status === 409) {
            const updatedTags = await fetchAllAvailableTags();
            const justCreatedTag = updatedTags?.find(
              (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
            );

            if (justCreatedTag) {
              tagToUse = justCreatedTag;
            } else {
              throw new Error(
                "A tag with this name already exists, but couldn't be found"
              );
            }
          } else {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to parse error response" }));

            throw new Error(
              errorData.error ||
                `Error ${response.status}: Failed to create tag`
            );
          }
        } else {
          const data = await response.json();
          tagToUse = data.programType;

          // Update the available tags list with the new tag
          setAvailableTags((prev) => [...prev, tagToUse]);
        }
      }

      // Now associate this tag with the project if it's not already associated
      if (tagToUse) {
        // Check if this tag is already associated with the project
        const isTagAlreadyAssociated = tags.some((t) => t.id === tagToUse.id);

        if (!isTagAlreadyAssociated) {
          // Encode projectId to handle special characters in URLs
          const encodedProjectId = encodeURIComponent(projectId);

          // Associate the tag with the project
          const response = await fetch(
            `/api/projects/${encodedProjectId}/tags`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tagIds: [...tags.map((t) => t.id), tagToUse.id],
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to parse error response" }));

            throw new Error(
              errorData.error ||
                `Error ${response.status}: Failed to associate tag with project`
            );
          }

          // Update tags locally instead of refetching
          const newTags = [...tags, tagToUse];
          setTags(newTags);
          broadcastTagsChange(newTags);
        }
      }

      setNewTagName("");
      setShowTagDropdown(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create tag";
      setError(errorMessage);
      if (onErrorAction) onErrorAction(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    setIsSaving(true);
    setError(null);

    try {
      // Encode projectId to handle special characters in URLs
      const encodedProjectId = encodeURIComponent(projectId);

      const response = await fetch(`/api/projects/${encodedProjectId}/tags`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tagId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        throw new Error(
          errorData.error || `Error ${response.status}: Failed to delete tag`
        );
      }

      // Update tags locally instead of refetching
      const newTags = tags.filter((tag) => tag.id !== tagId);
      setTags(newTags);
      broadcastTagsChange(newTags);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete tag";
      setError(errorMessage);
      if (onErrorAction) onErrorAction(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // NEW DROPDOWN RENDERING
  const renderTagDropdown = () => {
    if (!showTagDropdown || availableTags.length === 0) return null;

    return (
      <div
        className="tag-dropdown fixed inset-0 z-50"
        style={{ pointerEvents: "none" }} // Allows clicks to pass through the overlay
      >
        {/* Position the dropdown relative to the input */}
        <div
          className="absolute z-50"
          style={{
            top: inputRef.current
              ? inputRef.current.getBoundingClientRect().bottom +
                window.scrollY +
                4
              : 0,
            left: inputRef.current
              ? inputRef.current.getBoundingClientRect().left + window.scrollX
              : 0,
            width: inputRef.current ? inputRef.current.offsetWidth : "100%",
            maxHeight: "calc(80vh - 100px)", // Much larger max height - 80% of viewport
            pointerEvents: "auto", // Re-enable pointer events for the dropdown
          }}
        >
          <div
            className="rounded-md overflow-hidden border border-gray-700 shadow-lg"
            style={{
              backgroundColor: "#0D0D0D",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.9)",
            }}
          >
            <div
              className="text-xs text-gray-300 px-3 py-2 border-b border-gray-700 sticky top-0"
              style={{ backgroundColor: "#0D0D0D" }}
            >
              Available Tags ({filteredTags.length})
            </div>

            {/* Scrollable tag list with much larger height */}
            <div
              className="overflow-y-auto"
              style={{
                maxHeight: "calc(80vh - 150px)", // Make it much taller
                backgroundColor: "#0D0D0D",
              }}
            >
              {filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="px-3 py-2 hover:bg-primary/30 cursor-pointer transition-colors duration-150 border-b border-gray-800"
                    style={{ backgroundColor: "#0D0D0D", color: "white" }}
                    onClick={() => selectExistingTag(tag)}
                  >
                    {tag.name}
                  </div>
                ))
              ) : (
                <div
                  className="px-3 py-4 text-sm italic text-center"
                  style={{ backgroundColor: "#0D0D0D", color: "#9CA3AF" }}
                >
                  {newTagName.trim() !== ""
                    ? "No matching tags found. Press Create to add a new tag."
                    : "Type to search or create a new tag."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${compact ? "p-2" : "p-4"} space-y-2 relative`}>
      {compact && (
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Project Tags</h3>
          <button
            onClick={onCloseAction}
            className="text-foreground/70 hover:text-foreground"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="ml-2 text-sm text-foreground/70">
            Loading tags...
          </span>
        </div>
      ) : error ? (
        <div className="border border-error/30 bg-error/5 rounded p-2 text-sm text-error flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchTags}
            className="text-error hover:text-error/80"
            disabled={isLoading}
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
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <form onSubmit={createTag} className="flex items-center gap-2 mb-3">
              <div className="relative flex-grow">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTagName}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder="New tag name..."
                  className={`w-full ${
                    compact ? "text-sm py-1 px-2" : "py-2 px-3"
                  } rounded-md border-border/50 bg-background focus:border-primary focus:ring focus:ring-primary/20 focus:ring-opacity-50 outline-none transition-shadow`}
                  disabled={isSaving}
                  autoComplete="off"
                />
              </div>

              <button
                type="submit"
                className={`${
                  compact ? "text-xs py-1 px-2" : "text-sm py-2 px-3"
                } bg-primary text-white dark:text-white light:text-white font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1`}
                disabled={isSaving || !newTagName.trim()}
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>Create</span>
                  </>
                )}
              </button>
            </form>

            {/* Render the new dropdown implementation */}
            {renderTagDropdown()}
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className={`inline-flex items-center gap-1 ${
                    compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm"
                  } bg-primary/10 text-primary border border-primary/30 rounded-full group`}
                >
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteTag(tag.id)}
                    className="text-primary/70 hover:text-error group-hover:opacity-100 transition-opacity"
                    title="Remove tag"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p
              className={`${
                compact ? "text-xs" : "text-sm"
              } text-foreground/60 italic`}
            >
              No tags available. Create one above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
