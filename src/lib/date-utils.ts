/**
 * Date utility functions for consistent date handling across the application
 */

/**
 * Get the current week number (1-53) and year
 * @returns Object with the current week number and year
 */
export function getCurrentWeekAndYear(): { weekNumber: number; year: number } {
  const now = new Date();
  const year = now.getFullYear();

  // Calculate week number (ISO week)
  const start = new Date(year, 0, 1);
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

  return { weekNumber, year };
}

/**
 * Get start and end dates of a specific week
 * @param year The year
 * @param weekNumber The week number (1-53)
 * @returns Object with start and end dates
 */
export function getWeekStartAndEndDates(
  year: number,
  weekNumber: number
): { startDate: Date; endDate: Date } {
  // Get the first day of the year
  const firstDay = new Date(year, 0, 1);

  // Get the first Monday of the year or the first day if it's already a Monday
  const firstMonday = new Date(firstDay);
  if (firstMonday.getDay() !== 1) {
    // If first day is not Monday, move to next Monday
    firstMonday.setDate(
      firstMonday.getDate() + ((8 - firstMonday.getDay()) % 7)
    );
  }

  // Calculate the start date (Monday) of the requested week
  const startDate = new Date(firstMonday);
  startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Calculate the end date (Sunday) of the requested week
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return { startDate, endDate };
}

/**
 * Format a date in YYYY-MM-DD format
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get a range of week numbers between two week numbers in a year
 * @param year The year
 * @param startWeek The starting week number
 * @param endWeek The ending week number
 * @returns Array of week numbers
 */
export function getWeekNumbersInRange(
  year: number,
  startWeek: number,
  endWeek: number
): number[] {
  if (startWeek < 1) startWeek = 1;
  if (endWeek > 53) endWeek = 53;
  if (startWeek > endWeek) return [];

  return Array.from(
    { length: endWeek - startWeek + 1 },
    (_, i) => startWeek + i
  );
}

/**
 * Get a user-friendly string representation of a week range
 * @param year The year
 * @param weekNumber The week number
 * @returns String like "April 25 - May 1, 2025"
 */
export function getWeekRangeLabel(year: number, weekNumber: number): string {
  const { startDate, endDate } = getWeekStartAndEndDates(year, weekNumber);
  return `${startDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}`;
}
