"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Add function to get current week number and year
const getCurrentWeekInfo = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil(days / 7);

  return {
    weekNumber,
    year: now.getFullYear(),
  };
};

type Project = {
  id: string;
  name: string;
};

type ProjectMember = {
  id: string;
  hoursPerWeek: number;
  project: Project;
  // Add weekly hours field
  weeklyHours?: Array<{
    year: number;
    weekNumber: number;
    hours: number;
  }>;
};

type UserWithAllocations = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  maxHoursPerWeek: number;
  projectMembers: ProjectMember[];
  totalAllocatedHours: number;
  isOverbooked: boolean;
};

interface UserAllocationChartProps {
  users: UserWithAllocations[];
}

// Function to generate random pastel colors for projects
function generatePastelColor(index: number): string {
  const hue = (index * 137.5) % 360; // Use golden ratio to spread colors
  return `hsl(${hue}, 70%, 80%)`;
}

// Custom axis tick with user avatar that adapts to theme
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, users } = props;
  const user = users.find(
    (u: UserWithAllocations) =>
      u.name === payload.value || u.email === payload.value
  );
  const [imageError, setImageError] = React.useState(false);

  // Get user initials for fallback
  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    } else if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const userInitials = getInitials(user?.name, user?.email);

  return (
    <g transform={`translate(${x},${y})`}>
      {user?.image && !imageError ? (
        <foreignObject
          x={-15}
          y={5}
          width={30}
          height={30}
          style={{ overflow: "visible" }}
        >
          <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex justify-center items-center text-gray-600 dark:text-gray-300 font-bold text-xs shadow-sm">
            <img
              src={user.image}
              alt={user.name || user.email || "User"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        </foreignObject>
      ) : (
        <foreignObject
          x={-15}
          y={5}
          width={30}
          height={30}
          style={{ overflow: "visible" }}
        >
          <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-primary/70 flex justify-center items-center text-white font-bold text-xs shadow-sm">
            {userInitials}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export default function UserAllocationChart({
  users,
}: UserAllocationChartProps) {
  // Get current week information
  const { weekNumber, year } = getCurrentWeekInfo();

  // Generate a unique list of projects across all users
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    users.forEach((user) =>
      user.projectMembers.forEach((member) =>
        projectSet.add(member.project.name)
      )
    );
    return Array.from(projectSet);
  }, [users]);

  // Transform data for the stacked bar chart, using current week's data if available
  const chartData = useMemo(() => {
    return users.map((user) => {
      const userData: any = {
        name: user.name || user.email || "Unknown User",
        maxHours: user.maxHoursPerWeek,
        totalHours: 0, // Will be calculated based on current week's data
        isOverbooked: false, // Will be determined based on current week's data
        userId: user.id,
        image: user.image,
      };

      let totalWeeklyHours = 0;

      // Add hours for each project, using current week's data if available
      user.projectMembers.forEach((member) => {
        // Find hours for the current week if available
        const currentWeekHours = member.weeklyHours?.find(
          (wh) => wh.year === year && wh.weekNumber === weekNumber
        );

        // Use the weekly hours if available, otherwise fall back to the general allocation
        const hoursForProject = currentWeekHours?.hours ?? member.hoursPerWeek;

        // Ensure we're working with a valid number
        const numericHours = Number(hoursForProject) || 0;

        // Only add projects with non-zero hours
        if (numericHours > 0) {
          userData[member.project.name] = numericHours;
          totalWeeklyHours += numericHours;
        }
      });

      // Update total hours and overbooking status based on current week's data
      userData.totalHours = totalWeeklyHours;
      userData.isOverbooked = totalWeeklyHours > user.maxHoursPerWeek;

      return userData;
    });
  }, [users, year, weekNumber]);

  // Generate a filtered list of projects - only include projects with non-zero hours
  const activeProjects = useMemo(() => {
    const projectSet = new Set<string>();

    // Go through all users and their project data for the current week
    chartData.forEach((userData) => {
      // Look at all properties that aren't the standard chart properties
      Object.keys(userData).forEach((key) => {
        if (
          key !== "name" &&
          key !== "maxHours" &&
          key !== "totalHours" &&
          key !== "isOverbooked" &&
          key !== "userId" &&
          key !== "image" &&
          userData[key] > 0
        ) {
          projectSet.add(key);
        }
      });
    });

    return Array.from(projectSet);
  }, [chartData]);

  // Generate color map for projects
  const projectColors = useMemo(() => {
    const colors: Record<string, string> = {};
    activeProjects.forEach((project, index) => {
      colors[project] = generatePastelColor(index);
    });
    return colors;
  }, [activeProjects]);

  if (!users.length) {
    return (
      <div className="text-center p-4 text-gray-800 dark:text-gray-200">
        No user data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        User Allocations (Week {weekNumber}, {year})
      </h2>
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 30, bottom: 60 }}
            className="text-gray-800 dark:text-gray-200"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(120, 120, 120, 0.2)"
            />
            <XAxis
              dataKey="name"
              height={60}
              tick={<CustomizedAxisTick users={users} />}
              interval={0}
              stroke="currentColor"
            />
            <YAxis
              label={{
                value: "Hours per Week",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "currentColor" },
              }}
              stroke="currentColor"
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "maxHours") return [`${value} hours`, "Max Hours"];
                if (name === "totalHours") {
                  const formattedValue = isNaN(Number(value)) ? "0" : value;
                  return [`${formattedValue} hours`, "Total Hours"];
                }
                return [`${value} hours`, name];
              }}
              labelFormatter={(label) => {
                const user = users.find(
                  (u) => u.name === label || u.email === label
                );
                return user?.name || user?.email || "Unknown User";
              }}
              contentStyle={{
                backgroundColor: "rgb(30, 41, 59)", // Dark blue/slate color matching the screenshot
                color: "#ffffff", // White text for dark background
                border: "1px solid rgba(120, 120, 120, 0.3)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                padding: "10px 14px",
                opacity: 1, // Ensure the tooltip is completely opaque
              }}
              itemStyle={{
                padding: "2px 0",
                color: "#ffffff", // White text for better readability
              }}
              labelStyle={{
                fontWeight: "bold",
                marginBottom: "6px",
                color: "#ffffff", // White text for better readability
              }}
              cursor={{ fill: "rgba(100, 100, 100, 0.1)" }}
            />
            <Legend
              wrapperStyle={{ bottom: 0 }}
              formatter={(value) => (
                <span className="text-gray-800 dark:text-gray-200">
                  {value}
                </span>
              )}
            />

            {/* Project allocation bars */}
            {activeProjects.map((project, index) => (
              <Bar
                key={`project-${index}`}
                dataKey={project}
                stackId="a"
                fill={projectColors[project]}
              />
            ))}

            {/* Max hours threshold line */}
            <Bar
              dataKey="maxHours"
              fill="transparent"
              strokeDasharray="5 5"
              stroke="#8884d8"
              stackId="b"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  stroke={entry.isOverbooked ? "#ff0000" : "#8884d8"}
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
