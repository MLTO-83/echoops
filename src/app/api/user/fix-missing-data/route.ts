import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/firebase/auth";
import { users, projectMembers } from "@/lib/firebase/db";

/**
 * This is a utility endpoint to fix users with missing name/email data
 * It will update all users in the database that have null name or email values
 * or have problematic data from ADO imports
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication - only authenticated users can fix data
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get project ID from query param if specified for targeted fixes
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    let usersFixed: any[] = [];

    // If a projectId is provided, get specific members for that project
    if (projectId) {
      console.log(`Fixing members for project: ${projectId}`);
      const members = await projectMembers.findByProject(projectId);

      console.log(`Found ${members.length} members in project`);

      // Fetch user data for each member in parallel
      const memberUsers = await Promise.all(
        members.map(async (member: any) => {
          const user = await users.findById(member.userId);
          return { member, user };
        })
      );

      // Fix each member's user data
      for (const { member, user } of memberUsers) {
        if (!user) continue;
        const timestamp = Date.now().toString().slice(-6);

        // Check if user data needs fixing
        const needsFix =
          !user.name ||
          !user.email ||
          (user.name &&
            (user.name.includes("undefined") || user.name.includes("null"))) ||
          (user.email &&
            (user.email.includes("undefined") || user.email.includes("null")));

        if (needsFix) {
          const newName =
            user.name &&
            !user.name.includes("undefined") &&
            !user.name.includes("null")
              ? user.name
              : `Team Member ${timestamp}`;
          const newEmail =
            user.email &&
            !user.email.includes("undefined") &&
            !user.email.includes("null")
              ? user.email
              : `team-member-${timestamp}@example.com`;

          await users.update(user.id, { name: newName, email: newEmail });

          usersFixed.push({
            id: user.id,
            oldName: user.name,
            newName,
            oldEmail: user.email,
            newEmail,
          });
        }
      }
    } else {
      // If no projectId, fix all problematic users in the system
      const allUsers = await users.findMany();

      const usersWithIssues = allUsers.filter((user: any) => {
        return (
          !user.name ||
          !user.email ||
          (user.name && (user.name.includes("undefined") || user.name.includes("null"))) ||
          (user.email && (user.email.includes("undefined") || user.email.includes("null"))) ||
          user.name === "" ||
          user.email === ""
        );
      });

      console.log(
        `Found ${usersWithIssues.length} users with missing or problematic data`
      );

      // Fix each user
      for (const user of usersWithIssues) {
        const timestamp = Date.now().toString().slice(-6);

        try {
          const newName =
            user.name &&
            !user.name.includes("undefined") &&
            !user.name.includes("null") &&
            user.name !== ""
              ? user.name
              : `Team Member ${timestamp}`;
          const newEmail =
            user.email &&
            !user.email.includes("undefined") &&
            !user.email.includes("null") &&
            user.email !== ""
              ? user.email
              : `team-member-${timestamp}@example.com`;

          await users.update(user.id, { name: newName, email: newEmail });

          usersFixed.push({
            id: user.id,
            oldName: user.name,
            newName,
            oldEmail: user.email,
            newEmail,
          });
        } catch (updateError) {
          console.error(`Error updating user ${user.id}:`, updateError);
        }
      }
    }

    // If we've found no users to fix, let's do a direct fix with provided IDs
    if (usersFixed.length === 0) {
      const userIds = url.searchParams.get("userIds");
      if (userIds) {
        const idsToFix = userIds.split(",");
        console.log(
          `Directly fixing specified user IDs: ${idsToFix.join(", ")}`
        );

        for (const userId of idsToFix) {
          try {
            const user = await users.findById(userId.trim());

            if (user) {
              const timestamp = Date.now().toString().slice(-6);
              await users.update(user.id, {
                name: `Team Member ${timestamp}`,
                email: `team-member-${timestamp}@example.com`,
              });

              const updatedUser = await users.findById(user.id);

              usersFixed.push({
                id: user.id,
                oldName: user.name,
                newName: updatedUser!.name,
                oldEmail: user.email,
                newEmail: updatedUser!.email,
              });
            }
          } catch (error) {
            console.error(`Error fixing user ${userId}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${usersFixed.length} users with missing data`,
      updatedUsers: usersFixed,
    });
  } catch (error) {
    console.error("Error fixing user data:", error);
    return NextResponse.json(
      {
        error: `Failed to fix user data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
