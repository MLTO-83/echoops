"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/app/components/FirebaseAuthProvider";
import UserAllocationChart from "./UserAllocationChart";
import { getAllUsersWithAllocations } from "@/lib/actions/projectMember";
import { checkAdoIntegrationStatus } from "@/lib/actions/adoSync";
import Link from "next/link";

export default function UserAllocationContainer() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adoStatus, setAdoStatus] = useState({
    isIntegrated: false,
    hasSyncedData: false,
    checked: false,
  });
  const { data: session } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check ADO integration status first if we have a user ID
        if (session?.user?.id) {
          const adoStatusResult = await checkAdoIntegrationStatus(
            session.user.id
          );
          setAdoStatus({
            ...adoStatusResult,
            checked: true,
          });

          // Only fetch allocation data if integration is set up and data has been synced
          if (adoStatusResult.isIntegrated && adoStatusResult.hasSyncedData) {
            const userData = await getAllUsersWithAllocations();
            setUsers(userData);
          }
        }
      } catch (err) {
        console.error("Error fetching user allocations:", err);
        setError(err.message || "Failed to load user allocation data");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="w-full bg-card rounded-2xl shadow-lg p-6 min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-card text-card-foreground rounded-2xl shadow-lg p-6">
        <div className="text-red-500 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  // Show integration setup message if ADO is not integrated
  if (!adoStatus.isIntegrated) {
    return (
      <div className="w-full bg-card text-card-foreground rounded-2xl shadow-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3">
            Azure DevOps Integration Required
          </h3>
          <p className="mb-4">
            To view project allocation charts, please set up your Azure DevOps
            integration first.
          </p>
          <Link
            href="/settings"
            className="button-accent inline-flex items-center group"
          >
            <span>Set Up Integration</span>
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // Show sync message if ADO is integrated but no data has been synced
  if (!adoStatus.hasSyncedData) {
    return (
      <div className="w-full bg-card text-card-foreground rounded-2xl shadow-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-3">Sync Required</h3>
          <p className="mb-4">
            Your Azure DevOps integration is set up, but you need to sync your
            projects to view allocation charts.
          </p>
          <Link
            href="/projects/azure"
            className="button-primary inline-flex items-center group"
          >
            <span>Sync Projects</span>
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
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // We should only get here if both isIntegrated and hasSyncedData are true
  return (
    <div className="w-full bg-card text-card-foreground rounded-2xl shadow-lg p-6">
      <UserAllocationChart users={users} />
    </div>
  );
}
