import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/firebase/auth";
import { users, projects } from "@/lib/firebase/db";
import WeeklyHoursGrid from "@/app/components/WeeklyHoursGrid";
import { getProjectWeeklyHours } from "@/lib/actions/weeklyHours";

// In Next.js 15.3.1, let's use the native shape without custom typing
export default async function WeeklyHoursPage(props: any) {
  // Make sure to capture params in a way that doesn't trigger sync access warnings
  const projectId = props.params.projectId;

  // Check authentication with proper auth options
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Rest of your component remains the same
  // Get user's theme preference
  const user = await users.findById(session.user.id);
  const userTheme = user?.theme || "dark"; // Default to dark theme if not set

  // Fetch project data
  const project = await projects.findById(projectId);

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Project not found
        </div>
      </div>
    );
  }

  // Fetch project members with weekly hours
  const currentYear = new Date().getFullYear();
  const projectMembers = await getProjectWeeklyHours(projectId, currentYear);

  return (
    <div
      className={`container mx-auto px-4 py-8 ${
        userTheme === "dark"
          ? "bg-[#0F1A2B] text-white"
          : "bg-white text-gray-900"
      }`}
    >
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p
            className={userTheme === "dark" ? "text-gray-300" : "text-gray-600"}
          >
            Manage weekly hours for team members
          </p>
        </div>
        <Link
          href={`/projects/${projectId}`}
          className={`inline-flex items-center px-4 py-2 rounded-md ${
            userTheme === "dark"
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          } transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
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
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          Back to Project
        </Link>
      </div>

      <div
        className={
          userTheme === "dark"
            ? "bg-gray-900/80 rounded-lg shadow-md p-6"
            : "bg-white rounded-lg shadow-md p-6"
        }
      >
        <WeeklyHoursGrid
          projectId={projectId}
          members={projectMembers}
          initialYear={currentYear}
          theme={userTheme}
        />
      </div>
    </div>
  );
}
