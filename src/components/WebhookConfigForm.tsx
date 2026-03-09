"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { toast } from "sonner";

type WebhookConfigProps = {
  projectId: string;
};

type WebhookConfig = {
  id?: string;
  secret: string;
  active: boolean;
  agentInstructions?: string;
  repositoryName?: string;
  description?: string;
};

export default function WebhookConfigForm({ projectId }: WebhookConfigProps) {
  const [config, setConfig] = useState<WebhookConfig>({
    secret: "",
    active: false,
    agentInstructions: "",
    repositoryName: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Load webhook config on component mount
  useEffect(() => {
    async function loadWebhookConfig() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/webhook-config`
        );
        if (response.ok) {
          const data = await response.json();
          setConfig({
            ...data,
            // Don't show the full secret, for security
            secret: data.secret ? "********" : "",
          });
          setIsConfigLoaded(true);
        } else {
          // If 404, it means no config exists yet, which is fine
          if (response.status !== 404) {
            const errorData = await response.json();
            toast.error(
              `Failed to load webhook configuration: ${errorData.error}`
            );
          }
        }
      } catch (error) {
        console.error("Error loading webhook config:", error);
        toast.error("Failed to load webhook configuration");
      } finally {
        setLoading(false);
      }
    }

    loadWebhookConfig();
  }, [projectId]);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);

      // Don't send masked secret back to server
      const dataToSend = {
        ...config,
        secret: config.secret === "********" ? undefined : config.secret,
      };

      const response = await fetch(
        `/api/projects/${projectId}/webhook-config`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        }
      );

      if (response.ok) {
        toast.success("Webhook configuration updated successfully");
        // Reload the config to get the latest data
        const data = await response.json();
        setConfig({
          ...data.webhookConfig,
          // Keep existing values for the ones not returned by the API
          agentInstructions: config.agentInstructions,
          repositoryName: config.repositoryName,
          description: config.description,
        });
        setIsConfigLoaded(true);
      } else {
        const errorData = await response.json();
        toast.error(
          `Failed to update webhook configuration: ${errorData.error}`
        );
      }
    } catch (error) {
      console.error("Error updating webhook config:", error);
      toast.error("Failed to update webhook configuration");
    } finally {
      setLoading(false);
    }
  }

  // Handle input changes
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  }

  // Handle switch toggle
  function handleToggle(checked: boolean) {
    setConfig((prev) => ({ ...prev, active: checked }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Secret */}
          <div className="space-y-2">
            <Label htmlFor="secret">Webhook Secret</Label>
            <Input
              id="secret"
              name="secret"
              value={config.secret}
              onChange={handleChange}
              required={!isConfigLoaded}
              placeholder="Enter a secret key for webhook validation"
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              {isConfigLoaded
                ? "Leave unchanged to keep the current secret"
                : "Enter a secure secret that will be used to validate webhook requests"}
            </p>
          </div>

          {/* Active Switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={config.active}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
            <Label htmlFor="active">Enable Webhook</Label>
          </div>

          {/* Repository Name */}
          <div className="space-y-2">
            <Label htmlFor="repositoryName">Target Repository</Label>
            <Input
              id="repositoryName"
              name="repositoryName"
              value={config.repositoryName || ""}
              onChange={handleChange}
              placeholder="Enter the target repository name"
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              The repository where the AI agent will create pull requests
            </p>
          </div>

          {/* Agent Instructions */}
          <div className="space-y-2">
            <Label htmlFor="agentInstructions">AI Agent Instructions</Label>
            <Textarea
              id="agentInstructions"
              name="agentInstructions"
              value={config.agentInstructions || ""}
              onChange={handleChange}
              placeholder="Enter instructions for the AI agent"
              rows={5}
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              These instructions will be combined with the work item details to
              create the AI agent prompt
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              value={config.description || ""}
              onChange={handleChange}
              placeholder="Enter an optional description for this webhook"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
