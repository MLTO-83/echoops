/**
 * Error handling utilities for Prisma database operations
 */
import { PrismaClient } from "../../prisma/app/generated/prisma/client";
import { Prisma } from "../../prisma/app/generated/prisma/client";

// Error types
export enum PrismaErrorType {
  UNIQUE_CONSTRAINT = "unique_constraint",
  FOREIGN_KEY = "foreign_key",
  NOT_FOUND = "not_found",
  SCHEMA_VALIDATION = "schema_validation",
  DATABASE_CONNECTION = "database_connection",
  UNKNOWN = "unknown",
}

// Structure for parsed errors
export interface ParsedPrismaError {
  type: PrismaErrorType;
  message: string;
  field?: string;
  code?: string;
  original?: any;
}

/**
 * Parse Prisma errors into a more user-friendly format
 * @param error The Prisma error to parse
 * @returns A parsed error with type and user-friendly message
 */
export function parsePrismaError(error: any): ParsedPrismaError {
  // Handle Prisma-specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = error.code;

    // Unique constraint violation (e.g. duplicate email)
    if (code === "P2002") {
      const field = (error.meta?.target as string[]) || ["unknown field"];
      return {
        type: PrismaErrorType.UNIQUE_CONSTRAINT,
        message: `The ${field.join(
          ", "
        )} value already exists and must be unique.`,
        field: field.join(", "),
        code,
        original: error,
      };
    }

    // Foreign key constraint violation
    if (code === "P2003") {
      const field = (error.meta?.field_name as string) || "field";
      return {
        type: PrismaErrorType.FOREIGN_KEY,
        message: `The record you're referencing in ${field} doesn't exist.`,
        field,
        code,
        original: error,
      };
    }

    // Record not found
    if (code === "P2001" || code === "P2018") {
      return {
        type: PrismaErrorType.NOT_FOUND,
        message: "The record you are trying to update was not found.",
        code,
        original: error,
      };
    }

    // Default for other known errors
    return {
      type: PrismaErrorType.UNKNOWN,
      message: `Database error: ${error.message}`,
      code,
      original: error,
    };
  }

  // Schema validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      type: PrismaErrorType.SCHEMA_VALIDATION,
      message: "The data provided does not match the required schema.",
      original: error,
    };
  }

  // Connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      type: PrismaErrorType.DATABASE_CONNECTION,
      message: "Failed to connect to the database. Please try again later.",
      original: error,
    };
  }

  // Generic fallback
  return {
    type: PrismaErrorType.UNKNOWN,
    message: error.message || "An unexpected database error occurred.",
    original: error,
  };
}

/**
 * Safely execute a Prisma operation with error handling
 * @param operation The database operation to perform
 * @param errorHandler Optional custom error handler
 * @returns The result of the operation or throws a parsed error
 */
export async function safelyExecutePrismaOperation<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: ParsedPrismaError) => Promise<T> | T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const parsedError = parsePrismaError(error);

    // If a custom error handler is provided, use it
    if (errorHandler) {
      return await errorHandler(parsedError);
    }

    // Otherwise, throw the parsed error
    throw parsedError;
  }
}

/**
 * Safely attempt an operation with retries for transient errors
 * @param operation The database operation to perform
 * @param maxRetries Maximum number of retry attempts
 * @param delay Delay between retries in milliseconds
 * @returns The result of the operation
 */
export async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> {
  let lastError: any;

  // Try the operation up to maxRetries + 1 times
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const parsedError = parsePrismaError(error);

      // Only retry for connection errors or unknown errors that might be transient
      if (
        parsedError.type !== PrismaErrorType.DATABASE_CONNECTION &&
        parsedError.type !== PrismaErrorType.UNKNOWN
      ) {
        throw parsedError;
      }

      // Don't wait on the last attempt, just throw
      if (attempt === maxRetries) {
        throw parsedError;
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, delay * (attempt + 1))
      );

      // Increase delay for next retry (exponential backoff)
      delay *= 2;
    }
  }

  // This should never be reached due to the throw in the loop,
  // but TypeScript needs it for completeness
  throw parsePrismaError(lastError);
}
