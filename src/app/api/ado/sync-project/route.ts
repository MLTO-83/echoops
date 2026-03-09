import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { syncAzureProject } from "@/lib/actions/adoSync";

// POST /api/ado/sync-project - Sync an Azure DevOps project and return the local ID
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get adoProjectId from request body
    const body = await req.json();
    const { adoProjectId } = body;

    if (!adoProjectId) {
      return NextResponse.json(
        { error: "ADO Project ID is required" },
        { status: 400 }
      );
    }

    // Sync project and get the local ID
    const localProjectId = await syncAzureProject(adoProjectId);

    if (!localProjectId) {
      return NextResponse.json(
        { error: "Failed to sync project" },
        { status: 500 }
      );
    }

    // Return the local project ID
    return NextResponse.json({ localProjectId });
  } catch (error) {
    console.error("Error syncing project:", error);
    return NextResponse.json(
      { error: "Failed to sync project with database" },
      { status: 500 }
    );
  }
}
