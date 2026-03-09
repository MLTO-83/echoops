"use client";

import { useParams } from "next/navigation";
import WebhookConfigForm from "@/components/WebhookConfigForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectGeneralSettings from "@/components/ProjectGeneralSettings";
import ProjectMembersPanel from "@/components/ProjectMembersPanel";

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Project Settings</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <ProjectGeneralSettings projectId={projectId} />
        </TabsContent>

        <TabsContent value="members">
          <ProjectMembersPanel projectId={projectId} />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookConfigForm projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
