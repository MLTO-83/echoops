"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// Types for component props and data
type WeeklyHoursData = {
  id: string;
  year: number;
  weekNumber: number;
  hours: number;
};

type ProjectMember = {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    maxHoursPerWeek: number;
  };
  weeklyHours: WeeklyHoursData[];
};

interface WeeklyHoursGridProps {
  projectId: string;
  members: ProjectMember[];
  initialYear?: number;
  theme?: string;
}

// Helper functions
const getWeekRange = (year: number): { start: Date; end: Date }[] => {
  const weeks: { start: Date; end: Date }[] = [];

  // Create a date for January 1st of the given year
  const firstDay = new Date(year, 0, 1);

  // Adjust to the first day of the week (Sunday or Monday depending on locale)
  const dayOfWeek = firstDay.getDay();
  const diff = dayOfWeek === 0 ? 0 : dayOfWeek - 1;
  firstDay.setDate(firstDay.getDate() - diff);

  // Generate all weeks in the year
  let currentDay = new Date(firstDay);
  while (currentDay.getFullYear() <= year) {
    const weekStart = new Date(currentDay);
    currentDay.setDate(currentDay.getDate() + 6);
    const weekEnd = new Date(currentDay);

    // Only add if at least one day is in the target year
    if (weekStart.getFullYear() === year || weekEnd.getFullYear() === year) {
      weeks.push({ start: weekStart, end: weekEnd });
    }

    // Move to next week
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return weeks;
};

const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const getCurrentWeekNumber = (): number => {
  return getWeekNumber(new Date());
};

const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

const formatWeekLabel = (weekStart: Date, weekEnd: Date): string => {
  return `W${getWeekNumber(weekStart)} (${weekStart.toLocaleDateString(
    undefined,
    { month: "numeric", day: "numeric" }
  )} - ${weekEnd.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  })})`;
};

// Main component
const WeeklyHoursGrid: React.FC<WeeklyHoursGridProps> = ({
  projectId,
  members,
  initialYear = getCurrentYear(),
  theme = "dark", // Default to dark theme
}) => {
  const router = useRouter();
  const [year, setYear] = useState<number>(initialYear);
  const [weeks, setWeeks] = useState<{ start: Date; end: Date }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleWeekRange, setVisibleWeekRange] = useState({
    start: 1,
    end: 12,
  });
  const [bulkEditOpen, setBulkEditOpen] = useState<boolean>(false);
  const [bulkEditData, setBulkEditData] = useState<{
    memberId: string;
    weekRange: { start: number; end: number };
    hours: number;
  }>({
    memberId: "",
    weekRange: { start: 1, end: 4 },
    hours: 0,
  });

  // Add new state to track input values locally
  const [inputValues, setInputValues] = useState<{
    [key: string]: number;
  }>({});

  // Initialize weeks for the selected year
  useEffect(() => {
    const yearWeeks = getWeekRange(year);
    setWeeks(yearWeeks);

    // Set visible range to include current week if it's the current year
    if (year === getCurrentYear()) {
      const currentWeek = getCurrentWeekNumber();
      const startVisibleWeek = Math.max(1, currentWeek - 5);
      const endVisibleWeek = Math.min(52, currentWeek + 6);
      setVisibleWeekRange({ start: startVisibleWeek, end: endVisibleWeek });
    }
  }, [year]);

  // Helper function to generate a unique key for each cell
  const getCellKey = (memberId: string, weekNumber: number) => {
    return `${memberId}-${year}-${weekNumber}`;
  };

  // Get hours for a specific week - check local state first, then fallback to original data
  const getHoursForWeek = useCallback(
    (member: ProjectMember, weekNumber: number): number => {
      const cellKey = getCellKey(member.id, weekNumber);

      // If we have a value in our local state, use that
      if (inputValues[cellKey] !== undefined) {
        return inputValues[cellKey];
      }

      // Otherwise use the data from props
      const weekData = member.weeklyHours.find(
        (wh) => wh.year === year && wh.weekNumber === weekNumber
      );
      return weekData?.hours || 0;
    },
    [year, inputValues]
  );

  // Handle input change (update local state only)
  const handleInputChange = (
    memberId: string,
    weekNumber: number,
    value: string
  ) => {
    const newHours = parseFloat(value) || 0;
    if (newHours < 0) return;

    const cellKey = getCellKey(memberId, weekNumber);
    setInputValues((prev) => ({
      ...prev,
      [cellKey]: newHours,
    }));
  };

  // Handle blur event - send update to server only when user leaves the field
  const handleInputBlur = (memberId: string, weekNumber: number) => {
    const cellKey = getCellKey(memberId, weekNumber);
    const hours = inputValues[cellKey];

    // If no local value, nothing to update
    if (hours === undefined) return;

    // Only send update if value has actually changed
    const originalWeekData = members
      .find((m) => m.id === memberId)
      ?.weeklyHours.find(
        (wh) => wh.year === year && wh.weekNumber === weekNumber
      );
    const originalValue = originalWeekData?.hours || 0;

    if (hours !== originalValue) {
      updateHours(memberId, weekNumber, hours);
    }
  };

  // Update hours for a single cell
  const updateHours = async (
    memberId: string,
    weekNumber: number,
    hours: number
  ) => {
    if (hours < 0) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/weekly-hours`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectMemberId: memberId,
          year,
          weekNumber,
          hours,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update hours");
      }

      // Show success message
      setError("Hours updated successfully");
      setTimeout(() => setError(null), 3000);

      // Refresh the page to show updated data
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update hours for multiple weeks (bulk edit)
  const updateBulkHours = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/weekly-hours`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectMemberId: bulkEditData.memberId,
          year,
          weekRange: bulkEditData.weekRange,
          hours: bulkEditData.hours,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update hours");
      }

      // Show success message
      setError("Hours updated in bulk successfully");
      setTimeout(() => setError(null), 3000);

      // Close dialog and refresh data
      setBulkEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openBulkEdit = (memberId: string) => {
    setBulkEditData({
      memberId,
      weekRange: {
        start: visibleWeekRange.start,
        end: Math.min(visibleWeekRange.start + 4, visibleWeekRange.end),
      },
      hours: 0,
    });
    setBulkEditOpen(true);
  };

  // Calculate total hours for a member across visible weeks
  const getTotalHours = useCallback(
    (member: ProjectMember): number => {
      return member.weeklyHours
        .filter((wh) => wh.year === year)
        .reduce((sum, wh) => sum + wh.hours, 0);
    },
    [year]
  );

  // Navigate between week ranges
  const navigateWeeks = (direction: "prev" | "next") => {
    const rangeSize = visibleWeekRange.end - visibleWeekRange.start + 1;

    if (direction === "prev") {
      const newStart = Math.max(1, visibleWeekRange.start - rangeSize);
      setVisibleWeekRange({
        start: newStart,
        end: newStart + rangeSize - 1,
      });
    } else {
      const newStart = visibleWeekRange.end + 1;
      const newEnd = Math.min(52, newStart + rangeSize - 1);
      if (newStart <= 52) {
        setVisibleWeekRange({
          start: newStart,
          end: newEnd,
        });
      }
    }
  };

  // Year selection options
  const yearOptions = [
    {
      value: (getCurrentYear() - 1).toString(),
      label: (getCurrentYear() - 1).toString(),
    },
    { value: getCurrentYear().toString(), label: getCurrentYear().toString() },
    {
      value: (getCurrentYear() + 1).toString(),
      label: (getCurrentYear() + 1).toString(),
    },
  ];

  // Determine which weeks to show
  const visibleWeeks = weeks.filter((_, idx) => {
    const weekNum = idx + 1;
    return weekNum >= visibleWeekRange.start && weekNum <= visibleWeekRange.end;
  });

  // Theme specific classes
  const isDark = theme === "dark";

  // Theme-aware styling classes
  const tableHeaderClass = isDark
    ? "bg-gray-800 text-white"
    : "bg-gray-50 text-gray-500";
  const tableRowClass = isDark ? "border-gray-700" : "border-gray-200";
  const tableCellClass = isDark ? "text-white" : "text-gray-900";
  const tableBgClass = isDark ? "bg-gray-900" : "bg-white";
  const stickyHeaderClass = isDark ? "bg-gray-800" : "bg-gray-50";
  const stickyCellClass = isDark ? "bg-gray-900" : "bg-white";
  const currentWeekClass = isDark ? "bg-blue-900/30" : "bg-blue-50";
  const inputClass = isDark
    ? "w-16 text-center border border-gray-700 rounded-md shadow-sm bg-gray-800 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    : "w-16 text-center border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500";
  const buttonClass = isDark
    ? "px-3 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    : "px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50";
  const selectClass = isDark
    ? "px-3 py-2 border border-gray-600 rounded-md shadow-sm bg-gray-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    : "px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  const alertClass = isDark
    ? "bg-blue-900/30 border border-blue-800 text-blue-200 px-4 py-3 rounded relative mb-4"
    : "bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-4";
  const modalBgClass = isDark
    ? "bg-gray-800 text-white"
    : "bg-white text-gray-900";
  const modalButtonPrimaryClass = isDark
    ? "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
    : "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm";
  const modalButtonSecondaryClass = isDark
    ? "mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
    : "mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2
          className={`text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Weekly Hours Allocation
        </h2>

        <div className="flex items-center gap-2">
          <select
            className={selectClass}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            className={buttonClass}
            onClick={() => navigateWeeks("prev")}
            disabled={visibleWeekRange.start <= 1}
          >
            Previous
          </button>

          <span
            className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
          >
            Weeks {visibleWeekRange.start}-{visibleWeekRange.end}
          </span>

          <button
            className={buttonClass}
            onClick={() => navigateWeeks("next")}
            disabled={visibleWeekRange.end >= 52}
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className={alertClass} role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y ${tableRowClass}`}>
          <thead className={tableHeaderClass}>
            <tr>
              <th
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider sticky left-0 min-w-[200px] ${stickyHeaderClass}`}
              >
                Team Member
              </th>
              {visibleWeeks.map((week, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[100px] ${
                    isDark ? "text-gray-300" : "text-gray-500"
                  }`}
                >
                  {formatWeekLabel(week.start, week.end)}
                </th>
              ))}
              <th
                scope="col"
                className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[100px] ${
                  isDark ? "text-gray-300" : "text-gray-500"
                }`}
              >
                Total Hours
              </th>
              <th
                scope="col"
                className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[100px] ${
                  isDark ? "text-gray-300" : "text-gray-500"
                }`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`${tableBgClass} divide-y ${tableRowClass}`}>
            {members.map((member) => (
              <tr key={member.id}>
                <td
                  className={`px-6 py-4 whitespace-nowrap font-medium sticky left-0 ${tableCellClass} ${stickyCellClass}`}
                >
                  {member.user.name || member.user.email || "Unknown User"}
                </td>

                {visibleWeeks.map((week, idx) => {
                  const weekNumber = idx + visibleWeekRange.start;
                  const hours = getHoursForWeek(member, weekNumber);
                  const isCurrentWeek =
                    year === getCurrentYear() &&
                    weekNumber === getCurrentWeekNumber();

                  return (
                    <td
                      key={weekNumber}
                      className={`px-6 py-4 whitespace-nowrap text-center ${
                        isCurrentWeek ? currentWeekClass : ""
                      }`}
                    >
                      <input
                        type="number"
                        min="0"
                        value={hours}
                        onChange={(e) => {
                          handleInputChange(
                            member.id,
                            weekNumber,
                            e.target.value
                          );
                        }}
                        onBlur={() => {
                          handleInputBlur(member.id, weekNumber);
                        }}
                        onFocus={(e) => {
                          // Select all text when the input is focused
                          e.target.select();
                        }}
                        className={inputClass}
                      />
                    </td>
                  );
                })}

                <td
                  className={`px-6 py-4 whitespace-nowrap text-center font-bold ${tableCellClass}`}
                >
                  {getTotalHours(member)}h
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => openBulkEdit(member.id)}
                    className={`px-3 py-1 border ${
                      isDark ? "border-gray-600" : "border-gray-300"
                    } rounded-md shadow-sm text-sm font-medium ${
                      isDark
                        ? "text-white bg-gray-700 hover:bg-gray-600"
                        : "text-gray-700 bg-white hover:bg-gray-50"
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Bulk Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Edit Modal */}
      {bulkEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div
            className={`${modalBgClass} rounded-lg shadow-lg max-w-md w-full p-6 z-10`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-lg font-medium leading-6 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Bulk Edit Hours
              </h3>
              <button
                onClick={() => setBulkEditOpen(false)}
                className={`${
                  isDark
                    ? "text-gray-300 hover:text-gray-100"
                    : "text-gray-400 hover:text-gray-500"
                } focus:outline-none`}
              >
                <span className="sr-only">Close</span>
                &times;
              </button>
            </div>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Start Week
                  </label>
                  <select
                    value={bulkEditData.weekRange.start}
                    onChange={(e) => {
                      const start = parseInt(e.target.value);
                      setBulkEditData({
                        ...bulkEditData,
                        weekRange: {
                          start,
                          end: Math.max(start, bulkEditData.weekRange.end),
                        },
                      });
                    }}
                    className={`mt-1 block w-full ${
                      isDark
                        ? "border-gray-600 bg-gray-800 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map(
                      (weekNum) => (
                        <option key={weekNum} value={weekNum}>
                          Week {weekNum}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium ${
                      isDark ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    End Week
                  </label>
                  <select
                    value={bulkEditData.weekRange.end}
                    onChange={(e) => {
                      setBulkEditData({
                        ...bulkEditData,
                        weekRange: {
                          ...bulkEditData.weekRange,
                          end: parseInt(e.target.value),
                        },
                      });
                    }}
                    className={`mt-1 block w-full ${
                      isDark
                        ? "border-gray-600 bg-gray-800 text-white"
                        : "border-gray-300 bg-white text-gray-900"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    {Array.from(
                      { length: 52 - bulkEditData.weekRange.start + 1 },
                      (_, i) => i + bulkEditData.weekRange.start
                    ).map((weekNum) => (
                      <option key={weekNum} value={weekNum}>
                        Week {weekNum}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium ${
                    isDark ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Hours per Week
                </label>
                <input
                  type="number"
                  min="0"
                  value={bulkEditData.hours}
                  onChange={(e) => {
                    setBulkEditData({
                      ...bulkEditData,
                      hours: parseFloat(e.target.value) || 0,
                    });
                  }}
                  className={`mt-1 block w-full ${
                    isDark
                      ? "border-gray-600 bg-gray-800 text-white"
                      : "border-gray-300 bg-white text-gray-900"
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                />
              </div>

              {/* Quick presets */}
              <div className="space-y-2">
                <p
                  className={`text-sm font-medium ${
                    isDark ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Quick presets:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[4, 8, 16, 20, 40].map((hours) => (
                    <button
                      key={hours}
                      className={`px-3 py-1 border ${
                        isDark
                          ? "border-gray-600 text-white bg-gray-700 hover:bg-gray-600"
                          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      } rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      onClick={() => {
                        setBulkEditData({
                          ...bulkEditData,
                          hours,
                        });
                      }}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="button"
                className={modalButtonPrimaryClass}
                onClick={updateBulkHours}
                disabled={loading}
              >
                {loading ? "Updating..." : "Save Changes"}
              </button>
              <button
                type="button"
                className={modalButtonSecondaryClass}
                onClick={() => setBulkEditOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyHoursGrid;
