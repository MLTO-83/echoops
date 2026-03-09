import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * This is a utility endpoint to fix users with missing name/email data
 * It will update all users in the database that have null name or email values
 * or have problematic data from ADO imports
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication - only authenticated users can fix data
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get project ID from query param if specified for targeted fixes
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    let membersToFix = [];
    let usersFixed = [];

    // If a projectId is provided, get specific members for that project
    if (projectId) {
      console.log(`Fixing members for project: ${projectId}`);
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: true },
      });

      console.log(`Found ${projectMembers.length} members in project`);

      // Fix each member's user data
      for (const member of projectMembers) {
        const timestamp = Date.now().toString().slice(-6);
        const user = member.user;

        // Check if user data needs fixing
        const needsFix =
          !user.name ||
          !user.email ||
          (user.name &&
            (user.name.includes("undefined") || user.name.includes("null"))) ||
          (user.email &&
            (user.email.includes("undefined") || user.email.includes("null")));

        if (needsFix) {
          const fixedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              name:
                user.name &&
                !user.name.includes("undefined") &&
                !user.name.includes("null")
                  ? user.name
                  : `Team Member ${timestamp}`,
              email:
                user.email &&
                !user.email.includes("undefined") &&
                !user.email.includes("null")
                  ? user.email
                  : `team-member-${timestamp}@example.com`,
            },
          });

          usersFixed.push({
            id: fixedUser.id,
            oldName: user.name,
            newName: fixedUser.name,
            oldEmail: user.email,
            newEmail: fixedUser.email,
          });
        }
      }
    } else {
      // If no projectId, fix all problematic users in the system
      const usersWithIssues = await prisma.user.findMany({
        where: {
          OR: [
            { name: null },
            { email: null },
            { name: { contains: "undefined" } },
            { email: { contains: "undefined" } },
            { name: { contains: "null" } },
            { email: { contains: "null" } },
            { name: { equals: "" } },
            { email: { equals: "" } },
          ],
        },
      });

      console.log(
        `Found ${usersWithIssues.length} users with missing or problematic data`
      );

      // Also get users who lack critical data (broader check)
      const incompleteUsers = await prisma.user.findMany({
        where: {
          OR: [{ name: { equals: "" } }, { email: { equals: "" } }],
        },
      });

      console.log(`Found ${incompleteUsers.length} users with empty data`);

      // Combine all users that need fixing (removing duplicates)
      const allUsersToFix = [...usersWithIssues, ...incompleteUsers];
      const uniqueUserIds = new Set();
      const uniqueUsersToFix = [];

      for (const user of allUsersToFix) {
        if (!uniqueUserIds.has(user.id)) {
          uniqueUserIds.add(user.id);
          uniqueUsersToFix.push(user);
        }
      }

      // Fix each user
      for (const user of uniqueUsersToFix) {
        const timestamp = Date.now().toString().slice(-6);

        try {
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              name:
                user.name &&
                !user.name.includes("undefined") &&
                !user.name.includes("null") &&
                user.name !== ""
                  ? user.name
                  : `Team Member ${timestamp}`,
              email:
                user.email &&
                !user.email.includes("undefined") &&
                !user.email.includes("null") &&
                user.email !== ""
                  ? user.email
                  : `team-member-${timestamp}@example.com`,
            },
          });

          usersFixed.push({
            id: updatedUser.id,
            oldName: user.name,
            newName: updatedUser.name,
            oldEmail: user.email,
            newEmail: updatedUser.email,
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
            const user = await prisma.user.findUnique({
              where: { id: userId.trim() },
            });

            if (user) {
              const timestamp = Date.now().toString().slice(-6);
              const updatedUser = await prisma.user.update({
                where: { id: userId.trim() },
                data: {
                  name: `Team Member ${timestamp}`,
                  email: `team-member-${timestamp}@example.com`,
                },
              });

              usersFixed.push({
                id: updatedUser.id,
                oldName: user.name,
                newName: updatedUser.name,
                oldEmail: user.email,
                newEmail: updatedUser.email,
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
