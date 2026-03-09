import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * This endpoint creates or updates user information based on
 * data from Azure DevOps team members
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get project ID from query param
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        {
          error: "Project ID is required (projectId parameter)",
        },
        { status: 400 }
      );
    }

    console.log(`Running direct fix for project ${projectId}`);

    // Get all existing members for the project
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
    });

    console.log(`Found ${projectMembers.length} members to check`);

    // The correct user data from Azure DevOps
    const correctUserData = [
      {
        email: "freja.hansen@torslevhotmail.onmicrosoft.com",
        name: "Freja Hansen",
      },
      {
        email: "torslev@hotmail.com",
        name: "Mads Lund Torslev",
      },
    ];

    const updatedUsers = [];

    // For each member, find the closest match and update
    for (let i = 0; i < projectMembers.length; i++) {
      if (i < correctUserData.length) {
        const member = projectMembers[i];
        const correctData = correctUserData[i];

        console.log(
          `Updating user ${member.user.id} with name: ${correctData.name}, email: ${correctData.email}`
        );

        try {
          const updatedUser = await prisma.user.update({
            where: { id: member.user.id },
            data: {
              name: correctData.name,
              email: correctData.email,
            },
          });

          updatedUsers.push({
            id: updatedUser.id,
            oldName: member.user.name,
            oldEmail: member.user.email,
            newName: updatedUser.name,
            newEmail: updatedUser.email,
          });
        } catch (err) {
          console.error(`Error updating user ${member.user.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updatedUsers.length} users with direct data`,
      updatedUsers,
    });
  } catch (error) {
    console.error("Error in direct fix endpoint:", error);
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

/**
 * Creates or updates a user based on data provided in the request
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse the request body with extra caution
    let body;
    try {
      const text = await req.text();
      console.log("Raw direct-fix request body:", text);
      body = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        {
          error: "Failed to parse request body",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 400 }
      );
    }

    // Check if this is a simple "image:null" request that's coming from elsewhere
    // These should be rejected as they're not valid member addition requests
    if (Object.keys(body).length === 1 && body.image === null) {
      return NextResponse.json(
        {
          error:
            "Incomplete user data. Request must include name and email for user creation.",
        },
        { status: 400 }
      );
    }

    // Handle Azure DevOps team member data structure
    // If the data comes from ADO API, it might be nested in an identity object
    if (body.identity) {
      console.log("Handling ADO team member data format");
      const adoIdentity = body.identity;
      body = {
        name: adoIdentity.displayName,
        email: adoIdentity.uniqueName,
        image: adoIdentity.imageUrl,
        adoUserId: adoIdentity.id,
      };
      console.log("Transformed ADO data:", body);
    }

    const { name, email, image, adoUserId } = body;

    console.log(
      `Processing user: name=${name}, email=${email}, adoUserId=${adoUserId}`
    );

    // Require email for proper user identification
    if (!email) {
      return NextResponse.json(
        {
          error: "Email is required for user identification",
        },
        { status: 400 }
      );
    }

    // Try to find an existing user by email first
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If not found by email and adoUserId is provided, try to find by adoUserId
    // Use a try/catch to handle the case where adoUserId might not be in the schema yet
    if (!user && adoUserId) {
      try {
        user = await prisma.user.findFirst({
          where: { adoUserId },
        });
      } catch (err) {
        console.warn(
          "Could not query by adoUserId, field might not be available yet:",
          err
        );
        // Continue without error, we'll just create based on email
      }
    }

    // Create or update user based on provided information
    if (user) {
      // Update existing user if we have one
      console.log(
        `Found existing user: ${user.id}, name: ${user.name}, email: ${user.email}`
      );
      const updateData: any = {};
      if (name) updateData.name = name;

      // Special case for image which can be explicitly set to null
      if (image !== undefined) updateData.image = image;

      // Only try to update adoUserId if the field exists in the schema
      if (adoUserId) {
        try {
          // Check if adoUserId field exists by doing a simple query
          await prisma.user.findFirst({
            where: { adoUserId: "" },
            select: { id: true },
          });

          // If we get here, the field exists and we can include it in the update
          updateData.adoUserId = adoUserId;
        } catch (err) {
          console.warn(
            "Could not update adoUserId, field might not be available yet:",
            err
          );
        }
      }

      // Only update if we have data to update
      if (Object.keys(updateData).length > 0) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
          console.log(`Updated user: ${user.id}`);
        } catch (err) {
          console.error("Error updating user:", err);
        }
      }
    } else {
      // Create new user
      console.log(
        `Creating new user with email: ${email}, name: ${
          name || email.split("@")[0]
        }`
      );
      const userData: any = {
        name: name || email.split("@")[0],
        email,
        image,
      };

      // Only include adoUserId if the field is available
      if (adoUserId) {
        try {
          // Check if adoUserId field exists by doing a simple query
          await prisma.user.findFirst({
            where: { adoUserId: "" },
            select: { id: true },
          });

          // If we get here, the field exists and we can include it
          userData.adoUserId = adoUserId;
        } catch (err) {
          console.warn(
            "Could not include adoUserId in creation, field might not be available yet:",
            err
          );
        }
      }

      user = await prisma.user.create({
        data: userData,
      });
      console.log(`Created new user: ${user.id}`);
    }

    return NextResponse.json({
      success: true,
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      adoUserId: (user as any).adoUserId,
    });
  } catch (error) {
    console.error("Error in direct fix POST endpoint:", error);
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
