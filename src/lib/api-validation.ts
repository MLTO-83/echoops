/**
 * API validation utilities to ensure data consistency across API routes
 */

import { users, projects, adoConnections, projectMembers, projectMemberWeeklyHours } from "./firebase/db";
import { getCurrentWeekAndYear } from "./date-utils";

/**
 * Validation error with HTTP status code
 */
export class ApiValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ApiValidationError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates that a user exists
 * @param userId The user ID to validate
 * @throws ApiValidationError if validation fails
 */
export async function validateUserExists(userId: string): Promise<void> {
  const user = await users.findById(userId);

  if (!user) {
    throw new ApiValidationError(`User with ID ${userId} not found`, 404);
  }
}

/**
 * Validates that a project exists
 * @param projectId The project ID to validate
 * @throws ApiValidationError if validation fails
 */
export async function validateProjectExists(projectId: string): Promise<void> {
  const project = await projects.findById(projectId);

  if (!project) {
    throw new ApiValidationError(`Project with ID ${projectId} not found`, 404);
  }
}

/**
 * Ensures a ProjectMember has a corresponding WeeklyHours record for the current week
 * @param projectMemberId The project member ID
 * @returns The created or existing weekly hours entry
 */
export async function ensureWeeklyHoursExists(projectMemberId: string) {
  const { year, weekNumber } = getCurrentWeekAndYear();

  // Find the member by memberId to get projectId and userId
  const member = await projectMembers.findByMemberId(projectMemberId);
  if (!member) return null;

  // Check if weekly hours entry already exists
  const existingHours = await projectMemberWeeklyHours.findOne(
    member.projectId,
    member.userId,
    year,
    weekNumber
  );

  if (existingHours) {
    return existingHours;
  }

  // Create new weekly hours entry with 0 hours
  return projectMemberWeeklyHours.upsert(member.projectId, member.userId, {
    year,
    weekNumber,
    hours: 0,
    projectMemberId,
  });
}

/**
 * Validate ADO connection exists and is properly configured
 * @param connectionId The ADO connection ID (which is the organizationId)
 * @throws ApiValidationError if validation fails
 */
export async function validateADOConnection(connectionId: string) {
  const connection = await adoConnections.findByOrganizationId(connectionId);

  if (!connection) {
    throw new ApiValidationError(
      `ADO connection with ID ${connectionId} not found`,
      404
    );
  }

  if (!connection.adoOrganizationUrl || !connection.pat) {
    throw new ApiValidationError(
      "ADO connection is missing required fields (URL or PAT)",
      400
    );
  }

  return connection;
}

/**
 * Validate that ADO project references are valid
 * @param projectId The project ID
 * @throws ApiValidationError if validation fails
 */
export async function validateADOProject(projectId: string) {
  const project = await projects.findById(projectId);

  if (!project) {
    throw new ApiValidationError(`Project with ID ${projectId} not found`, 404);
  }

  if (!project.adoProjectId) {
    throw new ApiValidationError(
      `Project with ID ${projectId} is not linked to an ADO project`,
      400
    );
  }

  if (!project.adoConnectionId) {
    throw new ApiValidationError(
      `Project with ID ${projectId} has no ADO connection`,
      400
    );
  }

  const adoConnection = await adoConnections.findByOrganizationId(project.adoConnectionId);
  if (!adoConnection) {
    throw new ApiValidationError(
      `Project with ID ${projectId} has no ADO connection`,
      400
    );
  }

  return { ...project, adoConnection };
}
