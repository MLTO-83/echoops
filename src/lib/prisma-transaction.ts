/**
 * Prisma transaction utilities for ensuring data consistency
 */

import prisma from "../../prisma/client";

/**
 * Execute multiple database operations in a single transaction
 * @param operations A function that performs multiple database operations
 * @returns The result of the operations
 */
export async function executeTransaction<T>(
  operations: (
    tx: Omit<
      typeof prisma,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >
  ) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return await operations(tx);
  });
}

/**
 * Create a project member with weekly hours in a single transaction
 * @param data The project member data
 * @returns The created project member
 */
export async function createProjectMemberWithWeeklyHours(data: {
  userId: string;
  projectId: string;
  role?: string;
  weeklyHours: {
    year: number;
    weekNumber: number;
    hours: number;
  }[];
}) {
  return executeTransaction(async (tx) => {
    // First, create the project member
    const projectMember = await tx.projectMember.create({
      data: {
        userId: data.userId,
        projectId: data.projectId,
        role: data.role || "MEMBER",
      },
    });

    // Then create all weekly hours records
    const weeklyHours = await Promise.all(
      data.weeklyHours.map((wh) =>
        tx.projectMemberWeeklyHours.create({
          data: {
            projectMemberId: projectMember.id,
            year: wh.year,
            weekNumber: wh.weekNumber,
            hours: wh.hours,
          },
        })
      )
    );

    // Return combined result
    return {
      ...projectMember,
      weeklyHours,
    };
  });
}

/**
 * Update a project member and their weekly hours in a single transaction
 * @param memberId The ID of the project member
 * @param data The update data
 * @returns The updated project member
 */
export async function updateProjectMemberWithWeeklyHours(
  memberId: string,
  data: {
    role?: string;
    weeklyHours?: {
      year: number;
      weekNumber: number;
      hours: number;
    }[];
  }
) {
  return executeTransaction(async (tx) => {
    // Update project member basic info if role is provided
    if (data.role) {
      await tx.projectMember.update({
        where: { id: memberId },
        data: { role: data.role },
      });
    }

    // Update or create weekly hours records if provided
    const weeklyHours = data.weeklyHours
      ? await Promise.all(
          data.weeklyHours.map((wh) =>
            tx.projectMemberWeeklyHours.upsert({
              where: {
                projectMemberId_year_weekNumber: {
                  projectMemberId: memberId,
                  year: wh.year,
                  weekNumber: wh.weekNumber,
                },
              },
              update: { hours: wh.hours },
              create: {
                projectMemberId: memberId,
                year: wh.year,
                weekNumber: wh.weekNumber,
                hours: wh.hours,
              },
            })
          )
        )
      : [];

    // Return combined result
    const updatedMember = await tx.projectMember.findUnique({
      where: { id: memberId },
      include: {
        weeklyHours: true,
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return updatedMember;
  });
}

/**
 * Delete a project member and all related weekly hours in a single transaction
 * @param memberId The ID of the project member to delete
 * @returns The deleted project member
 */
export async function deleteProjectMemberWithWeeklyHours(memberId: string) {
  return executeTransaction(async (tx) => {
    // First, find the project member to return later
    const member = await tx.projectMember.findUnique({
      where: { id: memberId },
      include: {
        project: true,
        user: { select: { id: true, name: true, email: true } },
        weeklyHours: true,
      },
    });

    if (!member) {
      throw new Error("Project member not found");
    }

    // Delete all weekly hours records
    await tx.projectMemberWeeklyHours.deleteMany({
      where: { projectMemberId: memberId },
    });

    // Delete the project member
    await tx.projectMember.delete({
      where: { id: memberId },
    });

    return member;
  });
}
