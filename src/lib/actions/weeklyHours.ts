"use server";

import { revalidatePath } from "next/cache";
import { users, projects, projectMembers, projectMemberWeeklyHours } from "@/lib/firebase/db";

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
  const members = await projectMembers.findByUser(userId);

  // For each member, fetch weekly hours for the specified week
  const weeklyHoursResults = await Promise.all(
    members.map((member) =>
      projectMemberWeeklyHours.findOne(member.projectId, userId, year, weekNumber)
    )
  );

  // Sum up the hours for this specific week
  return weeklyHoursResults.reduce((total, wh) => {
    return total + (wh?.hours || 0);
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
  const user = await users.findById(userId);

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
  // We need projectId and userId - get them from the member record
  const currentMember = await projectMembers.findByMemberId(currentProjectMemberId);
  let currentMemberHours = 0;
  if (currentMember) {
    const currentWeeklyHours = await projectMemberWeeklyHours.findOne(
      currentMember.projectId, currentMember.userId, year, weekNumber
    );
    currentMemberHours = currentWeeklyHours?.hours || 0;
  }

  // Subtract current hours for this project member from total
  const currentHoursExcludingThisProject =
    currentHoursAcrossAllProjects - currentMemberHours;

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
  const member = await projectMembers.findByMemberId(projectMemberId);

  if (!member) {
    throw await createValidationError("Project member not found");
  }

  // Get user for capacity check
  const user = await users.findById(member.userId);

  // Check if setting these hours would exceed user's capacity
  const wouldOverbook = await wouldExceedWeeklyCapacity(
    member.userId,
    year,
    weekNumber,
    hours,
    projectMemberId
  );

  if (wouldOverbook) {
    const currentAllocated = await getTotalWeeklyAllocatedHours(
      member.userId,
      year,
      weekNumber
    );

    throw await createValidationError(
      `Setting ${hours} hours for week ${weekNumber}, ${year} would exceed user's maximum capacity of ${user?.maxHoursPerWeek} hours per week. ` +
        `Current allocated hours for this week: ${currentAllocated}.`
    );
  }

  // Update or create weekly hours entry using upsert
  const weeklyHours = await projectMemberWeeklyHours.upsert(member.projectId, member.userId, {
    year,
    weekNumber,
    hours,
  });

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${member.projectId}`);
  revalidatePath(`/projects/${member.projectId}/weekly-hours`);

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
  const member = await projectMembers.findByMemberId(projectMemberId);

  if (!member) {
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
  revalidatePath(`/projects/${member.projectId}`);
  revalidatePath(`/projects/${member.projectId}/weekly-hours`);

  return results;
}

/**
 * Gets all weekly hours entries for a project member
 * @param projectMemberId The ID of the project member
 * @param year Optional year to filter by
 * @returns Array of weekly hours entries
 */
export async function getWeeklyHours(projectMemberId: string, year?: number) {
  const member = await projectMembers.findByMemberId(projectMemberId);

  if (!member) {
    return [];
  }

  const allHours = await projectMemberWeeklyHours.findByMember(member.projectId, member.userId);

  // Filter by year if provided
  if (year) {
    return allHours.filter((wh: { year: number }) => wh.year === year);
  }

  return allHours;
}

/**
 * Gets weekly hours for all members in a project
 * @param projectId The project ID
 * @param year Optional year to filter by
 * @returns Project members with their weekly hours
 */
export async function getProjectWeeklyHours(projectId: string, year?: number) {
  const members = await projectMembers.findByProject(projectId);

  const membersWithDetails = await Promise.all(
    members.map(async (member) => {
      const [user, allHours] = await Promise.all([
        users.findById(member.userId),
        projectMemberWeeklyHours.findByMember(projectId, member.userId, year ? { year } : undefined),
      ]);

      return {
        ...member,
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              maxHoursPerWeek: user.maxHoursPerWeek,
            }
          : null,
        weeklyHours: allHours,
      };
    })
  );

  return membersWithDetails;
}

/**
 * Gets all weekly hours for a user across all projects
 * @param userId The ID of the user
 * @param year Optional year to filter by
 * @returns Array of weekly hours grouped by project
 */
export async function getUserWeeklyHours(userId: string, year?: number) {
  const members = await projectMembers.findByUser(userId);

  // Fetch project and weekly hours for each member in parallel
  const membersWithDetails = await Promise.all(
    members.map(async (member) => {
      const [project, allHours] = await Promise.all([
        projects.findById(member.projectId),
        projectMemberWeeklyHours.findByMember(member.projectId, userId),
      ]);

      // Filter by year if provided
      const filteredHours = year
        ? allHours.filter((wh: { year: number }) => wh.year === year)
        : allHours;

      return {
        ...member,
        project: project ? { id: project.id, name: project.name } : null,
        weeklyHours: filteredHours,
      };
    })
  );

  return membersWithDetails;
}
