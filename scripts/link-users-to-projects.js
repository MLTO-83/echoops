/**
 * Direct SQL fix for ADO team sync issues
 * Bypasses the Prisma ORM layer to directly add team members
 */
const prisma = require("../prisma/client");
const { randomUUID } = require("crypto");

// Team member data from ADO
const teamMemberData = {
  displayName: "Mads Lund Torslev",
  email: "torslev@hotmail.com",
  adoId: "d8f78bd6-65fc-6d92-be30-d5e7ea0322c1",
  adoProjectId: "38067a79-8d6c-4688-a2f1-eb96e6890daf",
  projectName: "OptCRM",
};

async function executeRawSQL(sql, params = []) {
  try {
    const result = await prisma.$queryRawUnsafe(sql, ...params);
    return result;
  } catch (error) {
    console.error(`SQL Error: ${error.message}`);
    if (error.meta?.message) {
      console.error(`Database says: ${error.meta.message}`);
    }
    throw error;
  }
}

async function findProject() {
  console.log(
    `Looking for project with ADO ID: ${teamMemberData.adoProjectId}`
  );

  const sql = `
    SELECT id, name 
    FROM "Project" 
    WHERE "adoProjectId" = $1
  `;

  const projects = await executeRawSQL(sql, [teamMemberData.adoProjectId]);

  if (!projects || projects.length === 0) {
    throw new Error("Project not found!");
  }

  console.log(`Found project: ${projects[0].name} (${projects[0].id})`);
  return projects[0];
}

async function findUser() {
  console.log(`Looking for user: ${teamMemberData.email}`);

  const sql = `
    SELECT id, name, email 
    FROM "User" 
    WHERE "email" = $1 OR "adoUserId" = $2
  `;

  const users = await executeRawSQL(sql, [
    teamMemberData.email,
    teamMemberData.adoId,
  ]);

  if (!users || users.length === 0) {
    throw new Error("User not found!");
  }

  console.log(
    `Found user: ${users[0].name || users[0].email} (${users[0].id})`
  );
  return users[0];
}

async function checkExistingMember(userId, projectId) {
  console.log("Checking if user is already a project member...");

  const sql = `
    SELECT id 
    FROM "ProjectMember" 
    WHERE "userId" = $1 AND "projectId" = $2
  `;

  const members = await executeRawSQL(sql, [userId, projectId]);

  if (members && members.length > 0) {
    console.log(`User is already a project member: ${members[0].id}`);
    return members[0];
  }

  console.log("User is not yet a project member");
  return null;
}

async function addProjectMember(userId, projectId) {
  console.log("Adding user as project member using direct SQL...");

  // Generate a UUID for the new member
  const memberId = randomUUID();

  const sql = `
    INSERT INTO "ProjectMember" (
      id, 
      "userId", 
      "projectId", 
      role, 
      "createdAt", 
      "updatedAt"
    ) 
    VALUES (
      $1, 
      $2, 
      $3, 
      $4, 
      CURRENT_TIMESTAMP, 
      CURRENT_TIMESTAMP
    ) 
    RETURNING id
  `;

  const result = await executeRawSQL(sql, [
    memberId,
    userId,
    projectId,
    "MEMBER",
  ]);

  if (!result || result.length === 0) {
    throw new Error("Failed to add project member");
  }

  console.log(`Successfully added project member: ${result[0].id}`);
  return result[0];
}

async function addWeeklyHours(projectMemberId) {
  console.log("Adding weekly hours tracking...");

  const now = new Date();
  const year = now.getFullYear();

  // Calculate week number
  const start = new Date(year, 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);

  // Generate UUID for weekly hours
  const weeklyHoursId = randomUUID();

  const sql = `
    INSERT INTO "ProjectMemberWeeklyHours" (
      id, 
      "projectMemberId", 
      year, 
      "weekNumber", 
      hours, 
      "createdAt", 
      "updatedAt"
    ) 
    VALUES (
      $1, 
      $2, 
      $3, 
      $4, 
      $5, 
      CURRENT_TIMESTAMP, 
      CURRENT_TIMESTAMP
    ) 
    RETURNING id
  `;

  const result = await executeRawSQL(sql, [
    weeklyHoursId,
    projectMemberId,
    year,
    weekNumber,
    0, // Default hours
  ]);

  if (!result || result.length === 0) {
    throw new Error("Failed to add weekly hours");
  }

  console.log(`Successfully added weekly hours: ${result[0].id}`);
  return result[0];
}

async function verifyFinalState(projectId) {
  console.log("\n===== FINAL VERIFICATION =====");

  const sql = `
    SELECT 
      pm.id as "memberId", 
      u.name as "userName", 
      u.email as "userEmail",
      (
        SELECT COUNT(*) 
        FROM "ProjectMemberWeeklyHours" wh 
        WHERE wh."projectMemberId" = pm.id
      ) as "weeklyHoursCount"
    FROM "ProjectMember" pm
    JOIN "User" u ON pm."userId" = u.id
    WHERE pm."projectId" = $1
  `;

  const members = await executeRawSQL(sql, [projectId]);

  console.log(`Project now has ${members.length} members:`);
  members.forEach((member) => {
    console.log(
      `- ${member.userName || member.userEmail} (${member.memberId})`
    );
    console.log(`  Weekly hours records: ${member.weeklyHoursCount}`);
  });
}

async function fixAdoTeamSync() {
  console.log("========== STARTING DIRECT SQL FIX ==========");

  try {
    // Find project
    const project = await findProject();

    // Find user
    const user = await findUser();

    // Check if member already exists
    const existingMember = await checkExistingMember(user.id, project.id);

    if (existingMember) {
      // Member exists, check weekly hours
      const weeklyHoursSql = `
        SELECT COUNT(*) as count 
        FROM "ProjectMemberWeeklyHours" 
        WHERE "projectMemberId" = $1
      `;

      const hoursCounts = await executeRawSQL(weeklyHoursSql, [
        existingMember.id,
      ]);

      if (hoursCounts[0].count === 0) {
        // Add weekly hours if none exist
        await addWeeklyHours(existingMember.id);
      } else {
        console.log(
          `Weekly hours already exist: ${hoursCounts[0].count} records`
        );
      }
    } else {
      // Add new member
      const newMember = await addProjectMember(user.id, project.id);

      // Add weekly hours
      await addWeeklyHours(newMember.id);
    }

    // Verify final state
    await verifyFinalState(project.id);

    console.log("\n========== FIX COMPLETE ==========");
    console.log("ADO team member was successfully added to the project.");
    console.log("\nTo fix the general ADO sync functionality:");
    console.log(
      "1. Add a restart step in your deployment process after schema migrations"
    );
    console.log(
      "2. Ensure Prisma client is properly regenerated after schema changes"
    );
    console.log(
      "3. Consider using $queryRaw for critical database operations during transition periods"
    );
  } catch (error) {
    console.error(`Failed: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixAdoTeamSync()
  .catch(console.error)
  .finally(() => console.log("Fix script execution completed."));
