"use server";

import { revalidatePath } from "next/cache";
import { users, projects, projectMembers, projectMemberWeeklyHours } from "@/lib/firebase/db";
import { getCurrentWeekAndYear } from "../date-utils";

/**
 * Error type for validation issues
 */
class ProjectMemberValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectMemberValidationError";
  }
}

/**
 * Creates a validation error with the ProjectMemberValidationError type
 * @param message Error message
 */
async function createValidationError(message: string) {
  return new ProjectMemberValidationError(message);
}

/**
 * Get the total allocated hours per week for a user across all projects
 * @param userId The ID of the user to check
 * @returns The total allocated hours per week
 */
export async function getTotalAllocatedHours(userId: string): Promise<number> {
  // Use the centralized date utility to get current week and year
  const { weekNumber: currentWeekNumber, year: currentYear } =
    getCurrentWeekAndYear();

  // Get all project members for the user
  const members = await projectMembers.findByUser(userId);

  // For each member, fetch weekly hours for the current week
  const weeklyHoursResults = await Promise.all(
    members.map((member) =>
      projectMemberWeeklyHours.findOne(member.projectId, userId, currentYear, currentWeekNumber)
    )
  );

  // Sum up the hours for the current week
  return weeklyHoursResults.reduce((total, wh) => {
    return total + (wh?.hours || 0);
  }, 0);
}

/**
 * Checks if adding or updating hours would exceed the user's maximum capacity
 * @param userId The ID of the user
 * @param additionalHours Additional hours to be added
 * @param currentMemberId The ID of the current project member being updated (if applicable)
 * @returns True if the operation would exceed the user's capacity, false otherwise
 */
export async function wouldExceedCapacity(
  userId: string,
  additionalHours: number,
  currentMemberId?: string
): Promise<boolean> {
  // Use the centralized date utility to get current week and year
  const { weekNumber: currentWeekNumber, year: currentYear } =
    getCurrentWeekAndYear();

  // Get user's maximum hours per week
  const user = await users.findById(userId);

  if (!user) {
    throw await createValidationError("User not found");
  }

  // Get user's current allocated hours
  let currentHours = await getTotalAllocatedHours(userId);

  // If updating an existing project member, subtract its current hours
  if (currentMemberId) {
    const currentMember = await projectMembers.findByMemberId(currentMemberId);

    if (currentMember) {
      const currentWeeklyHours = await projectMemberWeeklyHours.findOne(
        currentMember.projectId, currentMember.userId, currentYear, currentWeekNumber
      );
      if (currentWeeklyHours) {
        currentHours -= currentWeeklyHours.hours;
      }
    }
  }

  // Check if adding the new hours would exceed capacity
  return currentHours + additionalHours > user.maxHoursPerWeek;
}

/**
 * Creates a new project member with validation to prevent overbooking
 * @param data Project member data
 * @returns The created project member
 */
export async function createProjectMember(data: {
  userId: string;
  projectId: string;
  role?: string;
  hoursPerWeek: number;
  hoursPerMonth?: number;
}) {
  const { userId, projectId, hoursPerWeek } = data;

  // Use the centralized date utility to get current week and year
  const { weekNumber: currentWeekNumber, year: currentYear } =
    getCurrentWeekAndYear();

  // Check if adding this project would exceed the user's capacity
  const wouldOverbook = await wouldExceedCapacity(userId, hoursPerWeek);

  if (wouldOverbook) {
    const user = await users.findById(userId);

    const currentAllocated = await getTotalAllocatedHours(userId);

    throw await createValidationError(
      `Adding ${hoursPerWeek} hours would exceed user's maximum capacity of ${user?.maxHoursPerWeek} hours per week. ` +
        `Current allocated hours: ${currentAllocated}.`
    );
  }

  // Create the project member
  const member = await projectMembers.create({
    userId: data.userId,
    projectId: data.projectId,
    role: data.role || "MEMBER",
  });

  // Create weekly hours entry for the current week
  await projectMemberWeeklyHours.upsert(data.projectId, data.userId, {
    year: currentYear,
    weekNumber: currentWeekNumber,
    hours: hoursPerWeek,
  });

  // Fetch the weekly hours to return with the member
  const weeklyHours = await projectMemberWeeklyHours.findByMember(data.projectId, data.userId);

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${projectId}`);

  return { ...member, weeklyHours };
}

/**
 * Updates an existing project member with validation to prevent overbooking
 * @param memberId The ID of the project member to update
 * @param data Update data
 * @returns The updated project member
 */
export async function updateProjectMember(
  memberId: string,
  data: {
    role?: string;
    hoursPerWeek?: number;
    hoursPerMonth?: number;
  }
) {
  // Use the centralized date utility to get current week and year
  const { weekNumber: currentWeekNumber, year: currentYear } =
    getCurrentWeekAndYear();

  // Get the current project member
  const currentMember = await projectMembers.findByMemberId(memberId);

  if (!currentMember) {
    throw await createValidationError("Project member not found");
  }

  // Get current weekly hours
  const currentWeeklyHoursRecord = await projectMemberWeeklyHours.findOne(
    currentMember.projectId, currentMember.userId, currentYear, currentWeekNumber
  );
  const currentWeeklyHours = currentWeeklyHoursRecord?.hours || 0;

  // Check if updating hours would exceed capacity
  if (
    data.hoursPerWeek !== undefined &&
    data.hoursPerWeek !== currentWeeklyHours
  ) {
    const wouldOverbook = await wouldExceedCapacity(
      currentMember.userId,
      data.hoursPerWeek,
      memberId
    );

    if (wouldOverbook) {
      const user = await users.findById(currentMember.userId);

      const currentAllocated = await getTotalAllocatedHours(
        currentMember.userId
      );
      const difference = data.hoursPerWeek - currentWeeklyHours;

      throw await createValidationError(
        `Increasing hours by ${difference} would exceed user's maximum capacity of ${user?.maxHoursPerWeek} hours per week. ` +
          `Current allocated hours: ${currentAllocated}.`
      );
    }
  }

  // Update the project member basic info (role)
  // Note: In Firebase subcollection model, we need projectId and userId
  // For now, we can use the member data we already have
  // The projectMembers module should handle updates by memberId or by projectId+userId

  // Update or create the weekly hours record if hours are provided
  if (data.hoursPerWeek !== undefined) {
    await projectMemberWeeklyHours.upsert(currentMember.projectId, currentMember.userId, {
      year: currentYear,
      weekNumber: currentWeekNumber,
      hours: data.hoursPerWeek,
    });
  }

  // Fetch updated weekly hours
  const updatedWeeklyHours = await projectMemberWeeklyHours.findOne(
    currentMember.projectId, currentMember.userId, currentYear, currentWeekNumber
  );

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${currentMember.projectId}`);

  return { ...currentMember, weeklyHours: updatedWeeklyHours ? [updatedWeeklyHours] : [] };
}

/**
 * Deletes a project member
 * @param memberId The ID of the project member to delete
 * @returns The deleted project member
 */
export async function deleteProjectMember(memberId: string) {
  const member = await projectMembers.findByMemberId(memberId);

  if (!member) {
    throw await createValidationError("Project member not found");
  }

  await projectMembers.delete(member.projectId, member.userId);

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${member.projectId}`);

  return member;
}

/**
 * Get all projects for a user with their allocated hours
 * @param userId The ID of the user
 * @returns Array of project members with project details
 */
export async function getUserProjects(userId: string) {
  const members = await projectMembers.findByUser(userId);

  // Fetch project details for each member in parallel
  const membersWithProjects = await Promise.all(
    members.map(async (member) => {
      const project = await projects.findById(member.projectId);
      return { ...member, project };
    })
  );

  return membersWithProjects;
}

/**
 * Get all users with their project allocations
 * @returns Array of users with their project allocations and max hours per week
 */
export async function getAllUsersWithAllocations() {
  // Use the centralized date utility to get current week and year
  const { weekNumber: currentWeekNumber, year: currentYear } =
    getCurrentWeekAndYear();

  console.log(
    `Fetching user allocations for week ${currentWeekNumber}, ${currentYear}`
  );

  // Get all users
  const allUsers = await users.findMany();

  // Filter to users that have project memberships
  const usersWithAllocations = await Promise.all(
    allUsers.map(async (user) => {
      const members = await projectMembers.findByUser(user.id);
      if (members.length === 0) return null;

      const processedProjectMembers = await Promise.all(
        members.map(async (member) => {
          const [project, allHours] = await Promise.all([
            projects.findById(member.projectId),
            projectMemberWeeklyHours.findByMember(member.projectId, user.id),
          ]);

          const currentWeekHours = allHours.find(
            (wh) => wh.year === currentYear && wh.weekNumber === currentWeekNumber
          );
          const hoursForCurrentWeek = currentWeekHours?.hours || 0;

          return {
            ...member,
            hoursPerWeek: hoursForCurrentWeek,
            project: project ? { id: project.id, name: project.name } : null,
            weeklyHours: allHours,
          };
        })
      );

      const totalAllocatedHours = processedProjectMembers.reduce(
        (total, member) => total + member.hoursPerWeek,
        0
      );

      return {
        ...user,
        projectMembers: processedProjectMembers,
        totalAllocatedHours,
        isOverbooked: totalAllocatedHours > user.maxHoursPerWeek,
      };
    })
  );

  const result = usersWithAllocations.filter(Boolean);
  console.log(`Found ${result.length} users with project memberships`);
  return result;
}

/**
 * Sets uniform weekly hours for a project member across a range of weeks
 * @param projectMemberId The ID of the project member
 * @param hours Number of hours to set for each week
 * @param startWeek Starting week number
 * @param endWeek Ending week number
 * @param year The year for these weekly hours
 * @returns Array of created or updated weekly hours records
 */
export async function setUniformWeeklyHours(
  projectMemberId: string,
  hours: number,
  startWeek: number,
  endWeek: number,
  year: number
) {
  // Validate input
  if (
    startWeek < 1 ||
    startWeek > 53 ||
    endWeek < 1 ||
    endWeek > 53 ||
    startWeek > endWeek
  ) {
    throw await createValidationError("Invalid week range");
  }

  if (hours < 0) {
    throw await createValidationError("Hours cannot be negative");
  }

  // Get project member to validate and for revalidation
  const member = await projectMembers.findByMemberId(projectMemberId);

  if (!member) {
    throw await createValidationError("Project member not found");
  }

  // Upsert weekly hours for each week in the range
  const results = [];
  for (let week = startWeek; week <= endWeek; week++) {
    const result = await projectMemberWeeklyHours.upsert(member.projectId, member.userId, {
      year,
      weekNumber: week,
      hours,
    });
    results.push(result);
  }

  // Revalidate path to update UI
  revalidatePath(`/projects/${member.projectId}`);

  return results;
}

/**
 * Update weekly hours for a project member
 * @param projectMemberId The ID of the project member
 * @param weeklyHours Array of weekly hours data to update
 * @returns Array of created or updated weekly hours records
 */
export async function updateProjectMemberWeeklyHours(
  projectMemberId: string,
  weeklyHoursData: Array<{ year: number; weekNumber: number; hours: number }>
) {
  // Validate input
  if (!Array.isArray(weeklyHoursData) || weeklyHoursData.length === 0) {
    throw await createValidationError("Weekly hours data is required");
  }

  // Get project member to validate and for revalidation
  const member = await projectMembers.findByMemberId(projectMemberId);

  if (!member) {
    throw await createValidationError("Project member not found");
  }

  // Validate and upsert each weekly hours entry
  const results = [];
  for (const wh of weeklyHoursData) {
    // Validate weekly hours data
    if (
      typeof wh.year !== "number" ||
      typeof wh.weekNumber !== "number" ||
      typeof wh.hours !== "number" ||
      wh.weekNumber < 1 ||
      wh.weekNumber > 53 ||
      wh.hours < 0
    ) {
      throw await createValidationError("Invalid weekly hours data");
    }

    const result = await projectMemberWeeklyHours.upsert(member.projectId, member.userId, {
      year: wh.year,
      weekNumber: wh.weekNumber,
      hours: wh.hours,
    });
    results.push(result);
  }

  // Revalidate path to update UI
  revalidatePath(`/projects/${member.projectId}`);

  return results;
}
