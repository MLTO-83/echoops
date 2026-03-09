"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";

/**
 * Error type for validation issues
 */
class WeeklyHoursValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeeklyHoursValidationError";
  }
}

/**
 * Creates a validation error
 * @param message Error message
 */
async function createValidationError(message: string) {
  return new WeeklyHoursValidationError(message);
}

/**
 * Get the total allocated hours for a specific week for a user across all projects
 * @param userId The ID of the user to check
 * @param year The year to check
 * @param weekNumber The week number to check (1-52)
 * @returns The total allocated hours for that week
 */
export async function getTotalWeeklyAllocatedHours(
  userId: string,
  year: number,
  weekNumber: number
): Promise<number> {
  // Get all project members for this user
  const projectMembers = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      weeklyHours: {
        where: {
          year,
          weekNumber,
        },
      },
    },
  });

  // Sum up the hours for this specific week
  return projectMembers.reduce((total, member) => {
    const weeklyHoursEntry = member.weeklyHours.find(
      (entry) => entry.year === year && entry.weekNumber === weekNumber
    );
    return total + (weeklyHoursEntry?.hours || 0);
  }, 0);
}

/**
 * Checks if setting hours for a week would exceed the user's maximum capacity
 * @param userId The ID of the user
 * @param year The year for the week
 * @param weekNumber The week number (1-52)
 * @param hours Hours to set
 * @param currentProjectMemberId The ID of the current project member being updated
 * @returns True if the operation would exceed the user's capacity, false otherwise
 */
export async function wouldExceedWeeklyCapacity(
  userId: string,
  year: number,
  weekNumber: number,
  hours: number,
  currentProjectMemberId: string
): Promise<boolean> {
  // Get user's maximum hours per week
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxHoursPerWeek: true },
  });

  if (!user) {
    throw await createValidationError("User not found");
  }

  // Get user's current allocated hours for this week
  const currentHoursAcrossAllProjects = await getTotalWeeklyAllocatedHours(
    userId,
    year,
    weekNumber
  );

  // Get current hours for this project member in this week
  const currentWeeklyHours = await prisma.projectMemberWeeklyHours.findUnique({
    where: {
      projectMemberId_year_weekNumber: {
        projectMemberId: currentProjectMemberId,
        year,
        weekNumber,
      },
    },
  });

  // Subtract current hours for this project member from total
  const currentHoursExcludingThisProject =
    currentHoursAcrossAllProjects - (currentWeeklyHours?.hours || 0);

  // Check if adding the new hours would exceed capacity
  return currentHoursExcludingThisProject + hours > user.maxHoursPerWeek;
}

/**
 * Sets hours for a specific week for a project member
 * @param projectMemberId The ID of the project member
 * @param year The year
 * @param weekNumber The week number (1-52)
 * @param hours The hours to set
 * @returns The updated or created weekly hours entry
 */
export async function setWeeklyHours(
  projectMemberId: string,
  year: number,
  weekNumber: number,
  hours: number
) {
  // Validate inputs
  if (weekNumber < 1 || weekNumber > 53) {
    throw await createValidationError("Week number must be between 1 and 53");
  }

  if (hours < 0) {
    throw await createValidationError("Hours cannot be negative");
  }

  // Get the project member
  const projectMember = await prisma.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { user: true, project: true },
  });

  if (!projectMember) {
    throw await createValidationError("Project member not found");
  }

  // Check if setting these hours would exceed user's capacity
  const wouldOverbook = await wouldExceedWeeklyCapacity(
    projectMember.userId,
    year,
    weekNumber,
    hours,
    projectMemberId
  );

  if (wouldOverbook) {
    const user = projectMember.user;
    const currentAllocated = await getTotalWeeklyAllocatedHours(
      projectMember.userId,
      year,
      weekNumber
    );

    throw await createValidationError(
      `Setting ${hours} hours for week ${weekNumber}, ${year} would exceed user's maximum capacity of ${user.maxHoursPerWeek} hours per week. ` +
        `Current allocated hours for this week: ${currentAllocated}.`
    );
  }

  // Update or create weekly hours entry using upsert
  const weeklyHours = await prisma.projectMemberWeeklyHours.upsert({
    where: {
      projectMemberId_year_weekNumber: {
        projectMemberId,
        year,
        weekNumber,
      },
    },
    update: {
      hours,
    },
    create: {
      projectMemberId,
      year,
      weekNumber,
      hours,
    },
  });

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${projectMember.projectId}`);
  revalidatePath(`/projects/${projectMember.projectId}/weekly-hours`);

  return weeklyHours;
}

/**
 * Sets the same hours for multiple weeks at once
 * @param projectMemberId The ID of the project member
 * @param year The year
 * @param weekRange The range of weeks {start, end}
 * @param hours The hours to set for each week
 * @returns An array of the updated or created weekly hours entries
 */
export async function setBulkWeeklyHours(
  projectMemberId: string,
  year: number,
  weekRange: { start: number; end: number },
  hours: number
) {
  // Get the project member
  const projectMember = await prisma.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { project: true },
  });

  if (!projectMember) {
    throw await createValidationError("Project member not found");
  }

  const { start, end } = weekRange;

  // Validate week range
  if (start < 1 || end > 53 || start > end) {
    throw await createValidationError("Invalid week range");
  }

  // Create an array of week numbers in the range
  const weekNumbers = Array.from(
    { length: end - start + 1 },
    (_, i) => start + i
  );

  // For each week, check capacity and update or create weekly hours entries
  const results = [];
  for (const weekNumber of weekNumbers) {
    try {
      const result = await setWeeklyHours(
        projectMemberId,
        year,
        weekNumber,
        hours
      );
      results.push(result);
    } catch (error) {
      // If any week fails, stop and throw the error
      throw error;
    }
  }

  // Revalidate UI
  revalidatePath(`/projects/${projectMember.projectId}`);
  revalidatePath(`/projects/${projectMember.projectId}/weekly-hours`);

  return results;
}

/**
 * Gets all weekly hours entries for a project member
 * @param projectMemberId The ID of the project member
 * @param year Optional year to filter by
 * @returns Array of weekly hours entries
 */
export async function getWeeklyHours(projectMemberId: string, year?: number) {
  return prisma.projectMemberWeeklyHours.findMany({
    where: {
      projectMemberId,
      ...(year && { year }),
    },
    orderBy: [{ year: "asc" }, { weekNumber: "asc" }],
  });
}

/**
 * Gets weekly hours for all members in a project
 * @param projectId The project ID
 * @param year Optional year to filter by
 * @returns Project members with their weekly hours
 */
export async function getProjectWeeklyHours(projectId: string, year?: number) {
  return prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          maxHoursPerWeek: true,
        },
      },
      weeklyHours: {
        where: year ? { year } : undefined,
        orderBy: [{ year: "asc" }, { weekNumber: "asc" }],
      },
    },
  });
}

/**
 * Gets all weekly hours for a user across all projects
 * @param userId The ID of the user
 * @param year Optional year to filter by
 * @returns Array of weekly hours grouped by project
 */
export async function getUserWeeklyHours(userId: string, year?: number) {
  return prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      weeklyHours: {
        where: year ? { year } : undefined,
        orderBy: [{ year: "asc" }, { weekNumber: "asc" }],
      },
    },
  });
}
