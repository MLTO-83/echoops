"use server";

import { revalidatePath } from "next/cache";
import prisma from "../prisma";
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
  const projectMembers = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      weeklyHours: {
        where: {
          year: currentYear,
          weekNumber: currentWeekNumber,
        },
      },
    },
  });

  // Sum up the hours for the current week
  return projectMembers.reduce((total, member) => {
    // Get hours for the current week if available, otherwise default to 0
    const currentWeekHours = member.weeklyHours[0]?.hours || 0;
    return total + currentWeekHours;
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { maxHoursPerWeek: true },
  });

  if (!user) {
    throw await createValidationError("User not found");
  }

  // Get user's current allocated hours
  let currentHours = await getTotalAllocatedHours(userId);

  // If updating an existing project member, subtract its current hours
  if (currentMemberId) {
    const currentMember = await prisma.projectMember.findUnique({
      where: { id: currentMemberId },
      include: {
        weeklyHours: {
          where: {
            year: currentYear,
            weekNumber: currentWeekNumber,
          },
        },
      },
    });

    if (currentMember && currentMember.weeklyHours.length > 0) {
      currentHours -= currentMember.weeklyHours[0].hours;
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { maxHoursPerWeek: true },
    });

    const currentAllocated = await getTotalAllocatedHours(userId);

    throw await createValidationError(
      `Adding ${hoursPerWeek} hours would exceed user's maximum capacity of ${user?.maxHoursPerWeek} hours per week. ` +
        `Current allocated hours: ${currentAllocated}.`
    );
  }

  // Create the project member
  const projectMember = await prisma.projectMember.create({
    data: {
      userId: data.userId,
      projectId: data.projectId,
      role: data.role || "MEMBER",
      // Create weekly hours entry for the current week
      weeklyHours: {
        create: {
          year: currentYear,
          weekNumber: currentWeekNumber,
          hours: hoursPerWeek,
        },
      },
    },
    include: {
      weeklyHours: true,
    },
  });

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${projectId}`);

  return projectMember;
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

  // Get the current project member with weekly hours info
  const currentMember = await prisma.projectMember.findUnique({
    where: { id: memberId },
    include: {
      project: true,
      weeklyHours: {
        where: {
          year: currentYear,
          weekNumber: currentWeekNumber,
        },
      },
    },
  });

  if (!currentMember) {
    throw await createValidationError("Project member not found");
  }

  // Get current weekly hours
  const currentWeeklyHours = currentMember.weeklyHours[0]?.hours || 0;

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
      const user = await prisma.user.findUnique({
        where: { id: currentMember.userId },
        select: { maxHoursPerWeek: true },
      });

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

  // Update the project member basic info
  const updatedMember = await prisma.projectMember.update({
    where: { id: memberId },
    data: {
      ...(data.role && { role: data.role }),
    },
    include: {
      weeklyHours: {
        where: {
          year: currentYear,
          weekNumber: currentWeekNumber,
        },
      },
    },
  });

  // Update or create the weekly hours record if hours are provided
  if (data.hoursPerWeek !== undefined) {
    if (currentMember.weeklyHours.length > 0) {
      // Update existing weekly hours record
      await prisma.projectMemberWeeklyHours.update({
        where: {
          id: currentMember.weeklyHours[0].id,
        },
        data: {
          hours: data.hoursPerWeek,
        },
      });
    } else {
      // Create new weekly hours record
      await prisma.projectMemberWeeklyHours.create({
        data: {
          projectMemberId: memberId,
          year: currentYear,
          weekNumber: currentWeekNumber,
          hours: data.hoursPerWeek,
        },
      });
    }
  }

  // Revalidate related paths to update UI
  revalidatePath(`/projects/${currentMember.projectId}`);

  return updatedMember;
}

/**
 * Deletes a project member
 * @param memberId The ID of the project member to delete
 * @returns The deleted project member
 */
export async function deleteProjectMember(memberId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { id: memberId },
    include: { project: true },
  });

  if (!member) {
    throw await createValidationError("Project member not found");
  }

  await prisma.projectMember.delete({
    where: { id: memberId },
  });

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
  return prisma.projectMember.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
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

  // Get all users with their maxHoursPerWeek setting
  // Only include users that have at least one project member record
  const users = await prisma.user.findMany({
    where: {
      projectMembers: {
        some: {}, // This ensures we only get users with at least one project member
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      maxHoursPerWeek: true,
      projectMembers: {
        select: {
          id: true,
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          weeklyHours: {
            select: {
              year: true,
              weekNumber: true,
              hours: true,
            },
          },
        },
      },
    },
  });

  console.log(`Found ${users.length} users with project memberships`);

  // For debugging: log all users with their project members
  users.forEach((user) => {
    console.log(
      `User: ${user.name || user.email || "Unknown"}, Projects: ${
        user.projectMembers.length
      }`
    );
    if (user.projectMembers.length > 0) {
      user.projectMembers.forEach((pm) => {
        const weeklyHours = pm.weeklyHours.find(
          (wh) => wh.year === currentYear && wh.weekNumber === currentWeekNumber
        );
        console.log(
          `- Project: ${pm.project.name}, Weekly Hours: ${
            weeklyHours?.hours || 0
          }`
        );
      });
    }
  });

  // Calculate total allocated hours and determine if overbooked
  return users.map((user) => {
    // Process project members and their weekly hours
    const processedProjectMembers = user.projectMembers.map((member) => {
      // Find the current week's hours or default to 0
      const currentWeekHours = member.weeklyHours.find(
        (wh) => wh.year === currentYear && wh.weekNumber === currentWeekNumber
      );

      // Default to 0 hours if no weekly hours record exists for current week
      const hoursForCurrentWeek = currentWeekHours?.hours || 0;

      return {
        ...member,
        hoursPerWeek: hoursForCurrentWeek, // Add for backward compatibility
        project: member.project,
        weeklyHours: member.weeklyHours,
      };
    });

    // Calculate total allocated hours for the current week
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
  });
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
  const projectMember = await prisma.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { project: true },
  });

  if (!projectMember) {
    throw await createValidationError("Project member not found");
  }

  // Create an array of operations, one for each week in the range
  const weeklyHoursOps = [];

  for (let week = startWeek; week <= endWeek; week++) {
    // Check if a record already exists for this week
    const existingRecord = await prisma.projectMemberWeeklyHours.findUnique({
      where: {
        projectMemberId_year_weekNumber: {
          projectMemberId,
          year,
          weekNumber: week,
        },
      },
    });

    if (existingRecord) {
      // Update existing record
      weeklyHoursOps.push(
        prisma.projectMemberWeeklyHours.update({
          where: { id: existingRecord.id },
          data: { hours },
        })
      );
    } else {
      // Create new record
      weeklyHoursOps.push(
        prisma.projectMemberWeeklyHours.create({
          data: {
            projectMemberId,
            year,
            weekNumber: week,
            hours,
          },
        })
      );
    }
  }

  // Execute all operations in a transaction
  const results = await prisma.$transaction(weeklyHoursOps);

  // Revalidate path to update UI
  revalidatePath(`/projects/${projectMember.projectId}`);

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
  weeklyHours: Array<{ year: number; weekNumber: number; hours: number }>
) {
  // Validate input
  if (!Array.isArray(weeklyHours) || weeklyHours.length === 0) {
    throw await createValidationError("Weekly hours data is required");
  }

  // Get project member to validate and for revalidation
  const projectMember = await prisma.projectMember.findUnique({
    where: { id: projectMemberId },
    include: { project: true },
  });

  if (!projectMember) {
    throw await createValidationError("Project member not found");
  }

  // Create an array of operations, one for each week in the input
  const weeklyHoursOps = [];

  for (const wh of weeklyHours) {
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

    // Check if a record already exists for this week
    const existingRecord = await prisma.projectMemberWeeklyHours.findUnique({
      where: {
        projectMemberId_year_weekNumber: {
          projectMemberId,
          year: wh.year,
          weekNumber: wh.weekNumber,
        },
      },
    });

    if (existingRecord) {
      // Update existing record
      weeklyHoursOps.push(
        prisma.projectMemberWeeklyHours.update({
          where: { id: existingRecord.id },
          data: { hours: wh.hours },
        })
      );
    } else {
      // Create new record
      weeklyHoursOps.push(
        prisma.projectMemberWeeklyHours.create({
          data: {
            projectMemberId,
            year: wh.year,
            weekNumber: wh.weekNumber,
            hours: wh.hours,
          },
        })
      );
    }
  }

  // Execute all operations in a transaction
  const results = await prisma.$transaction(weeklyHoursOps);

  // Revalidate path to update UI
  revalidatePath(`/projects/${projectMember.projectId}`);

  return results;
}
