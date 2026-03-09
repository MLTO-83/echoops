/**
 * Error handling utilities for Firestore database operations
 */

export enum FirestoreErrorType {
  ALREADY_EXISTS = "already_exists",
  NOT_FOUND = "not_found",
  PERMISSION_DENIED = "permission_denied",
  UNAVAILABLE = "unavailable",
  INVALID_ARGUMENT = "invalid_argument",
  UNKNOWN = "unknown",
}

export interface ParsedFirestoreError {
  type: FirestoreErrorType;
  message: string;
  field?: string;
  code?: string;
  original?: unknown;
}

/**
 * Parse Firestore errors into a user-friendly format
 */
export function parseFirestoreError(error: unknown): ParsedFirestoreError {
  if (error instanceof Error) {
    const message = error.message || "";

    // gRPC status codes from firebase-admin
    if (message.includes("ALREADY_EXISTS") || message.includes("6 ALREADY_EXISTS")) {
      return {
        type: FirestoreErrorType.ALREADY_EXISTS,
        message: "A record with that value already exists.",
        original: error,
      };
    }

    if (message.includes("NOT_FOUND") || message.includes("5 NOT_FOUND")) {
      return {
        type: FirestoreErrorType.NOT_FOUND,
        message: "The record you are looking for was not found.",
        original: error,
      };
    }

    if (message.includes("PERMISSION_DENIED") || message.includes("7 PERMISSION_DENIED")) {
      return {
        type: FirestoreErrorType.PERMISSION_DENIED,
        message: "You do not have permission to perform this action.",
        original: error,
      };
    }

    if (message.includes("UNAVAILABLE") || message.includes("14 UNAVAILABLE")) {
      return {
        type: FirestoreErrorType.UNAVAILABLE,
        message: "The database is temporarily unavailable. Please try again later.",
        original: error,
      };
    }

    if (message.includes("INVALID_ARGUMENT") || message.includes("3 INVALID_ARGUMENT")) {
      return {
        type: FirestoreErrorType.INVALID_ARGUMENT,
        message: "The data provided is invalid.",
        original: error,
      };
    }

    return {
      type: FirestoreErrorType.UNKNOWN,
      message: error.message || "An unexpected database error occurred.",
      original: error,
    };
  }

  return {
    type: FirestoreErrorType.UNKNOWN,
    message: "An unexpected database error occurred.",
    original: error,
  };
}

/**
 * Safely execute a Firestore operation with error handling
 */
export async function safelyExecuteOperation<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: ParsedFirestoreError) => Promise<T> | T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const parsedError = parseFirestoreError(error);
    if (errorHandler) {
      return await errorHandler(parsedError);
    }
    throw parsedError;
  }
}

/**
 * Retry an operation with exponential backoff for transient errors
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const parsedError = parseFirestoreError(error);

      if (
        parsedError.type !== FirestoreErrorType.UNAVAILABLE &&
        parsedError.type !== FirestoreErrorType.UNKNOWN
      ) {
        throw parsedError;
      }

      if (attempt === maxRetries) {
        throw parsedError;
      }

      await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
      delay *= 2;
    }
  }

  throw parseFirestoreError(lastError);
}
