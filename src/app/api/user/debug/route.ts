import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * Debug endpoint that echos request info for troubleshooting
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse the request body
    let body;
    try {
      const text = await req.text();
      console.log("Raw request body:", text);
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        {
          error: "Failed to parse request body",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 400 }
      );
    }

    // Echo back request info
    return NextResponse.json({
      success: true,
      message: "Debug info",
      requestInfo: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
        body,
        session: {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        error: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
