"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ProjectMembersPanelProps {
  projectId: string;
}

export default function ProjectMembersPanel({
  projectId,
}: ProjectMembersPanelProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Placeholder members data
  const members = [
    { id: "1", name: "John Doe", email: "john@example.com", role: "OWNER" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "MEMBER" },
  ];

  const handleAddMember = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      // Placeholder for actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Team member invited");
      setEmail("");
    } catch (error) {
      toast.error("Failed to invite team member");
      console.error("Error inviting team member:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Members</CardTitle>
        <CardDescription>Manage who has access to this project</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleAddMember} disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Member"}
          </Button>
        </div>

        <div className="border rounded-md divide-y">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{member.role}</span>
                {member.role !== "OWNER" && (
                  <Button variant="outline" size="sm">
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
