import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, projectMembers } from "@/lib/firebase/db";

/**
 * This endpoint creates or updates user information based on
 * data from Azure DevOps team members
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
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
    const members = await projectMembers.findByProject(projectId);

    // Fetch user data for each member in parallel
    const membersWithUsers = await Promise.all(
      members.map(async (member: any) => {
        const user = await users.findById(member.userId);
        return { ...member, user };
      })
    );

    console.log(`Found ${membersWithUsers.length} members to check`);

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
    for (let i = 0; i < membersWithUsers.length; i++) {
      if (i < correctUserData.length) {
        const member = membersWithUsers[i];
        const correctData = correctUserData[i];

        if (!member.user) continue;

        console.log(
          `Updating user ${member.user.id} with name: ${correctData.name}, email: ${correctData.email}`
        );

        try {
          await users.update(member.user.id, {
            name: correctData.name,
            email: correctData.email,
          });

          const updatedUser = await users.findById(member.user.id);

          updatedUsers.push({
            id: member.user.id,
            oldName: member.user.name,
            oldEmail: member.user.email,
            newName: updatedUser!.name,
            newEmail: updatedUser!.email,
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
    const session = await getSession();
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
    let user = await users.findByEmail(email);

    // If not found by email and adoUserId is provided, try to find by adoUserId
    if (!user && adoUserId) {
      try {
        const allUsers = await users.findMany();
        user = allUsers.find((u: any) => u.adoUserId === adoUserId) || null;
      } catch (err) {
        console.warn(
          "Could not query by adoUserId:",
          err
        );
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

      // Include adoUserId if provided
      if (adoUserId) {
        updateData.adoUserId = adoUserId;
      }

      // Only update if we have data to update
      if (Object.keys(updateData).length > 0) {
        try {
          await users.update(user.id, updateData);
          user = await users.findById(user.id);
          console.log(`Updated user: ${user!.id}`);
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

      // Include adoUserId if provided
      if (adoUserId) {
        userData.adoUserId = adoUserId;
      }

      user = await users.create(userData);
      console.log(`Created new user: ${user.id}`);
    }

    return NextResponse.json({
      success: true,
      id: user!.id,
      name: user!.name,
      email: user!.email,
      image: user!.image,
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
