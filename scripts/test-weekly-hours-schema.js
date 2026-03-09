/**
 * Test script to validate the critical paths for project member creation with weekly hours
 * Run this after schema changes to ensure everything works correctly
 */

const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();

async function testProjectMemberWeeklyHours() {
  console.log("Testing project member creation with weekly hours...");
  const testResults = {
    createProjectMember: { success: false, message: "" },
    updateWeeklyHours: { success: false, message: "" },
    getBulkWeeklyHours: { success: false, message: "" },
    cleanup: { success: false, message: "" },
  };

  try {
    // 0. Get current week and year
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor(
      (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
    );
    const currentWeekNumber = Math.ceil((days + start.getDay() + 1) / 7);

    console.log(`Current week: ${currentWeekNumber}, year: ${year}`);

    // 1. Create a test user (if needed)
    let testUser = await prisma.user.findFirst({
      where: { email: "test-weekly-hours@example.com" },
    });

    if (!testUser) {
      console.log("Creating test user...");
      testUser = await prisma.user.create({
        data: {
          name: "Weekly Hours Test User",
          email: "test-weekly-hours@example.com",
          theme: "dark",
          maxHoursPerWeek: 40,
        },
      });
    }

    console.log(`Using test user with ID: ${testUser.id}`);

    // 2. Create a test project (if needed)
    let testProject = await prisma.project.findFirst({
      where: { name: "Weekly Hours Test Project" },
    });

    if (!testProject) {
      console.log("Creating test project...");
      testProject = await prisma.project.create({
        data: {
          name: "Weekly Hours Test Project",
        },
      });
    }

    console.log(`Using test project with ID: ${testProject.id}`);

    // 3. Create a project member with weekly hours
    console.log("Creating test project member with weekly hours...");
    const projectMember = await prisma.projectMember.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: "MEMBER",
        weeklyHours: {
          create: {
            year,
            weekNumber: currentWeekNumber,
            hours: 10,
          },
        },
      },
      include: {
        weeklyHours: true,
      },
    });

    console.log(`Created project member with ID: ${projectMember.id}`);
    console.log(`Weekly hours records: ${projectMember.weeklyHours.length}`);

    if (projectMember.weeklyHours.length > 0) {
      testResults.createProjectMember.success = true;
      testResults.createProjectMember.message =
        "Successfully created project member with weekly hours";
    } else {
      testResults.createProjectMember.message =
        "Failed to create weekly hours record";
      throw new Error("Weekly hours record was not created");
    }

    // 4. Update weekly hours for a different week
    console.log("Testing weekly hours update for a different week...");
    let nextWeekNumber = currentWeekNumber + 1;
    if (nextWeekNumber > 52) nextWeekNumber = 1;

    const weeklyHours = await prisma.projectMemberWeeklyHours.upsert({
      where: {
        projectMemberId_year_weekNumber: {
          projectMemberId: projectMember.id,
          year,
          weekNumber: nextWeekNumber,
        },
      },
      update: {
        hours: 15,
      },
      create: {
        projectMemberId: projectMember.id,
        year,
        weekNumber: nextWeekNumber,
        hours: 15,
      },
    });

    console.log(
      `Updated/created weekly hours for week ${nextWeekNumber}: ${weeklyHours.hours} hours`
    );
    testResults.updateWeeklyHours.success = true;
    testResults.updateWeeklyHours.message = "Successfully updated weekly hours";

    // 5. Get all weekly hours for project member
    console.log("Testing retrieval of all weekly hours...");
    const allWeeklyHours = await prisma.projectMemberWeeklyHours.findMany({
      where: {
        projectMemberId: projectMember.id,
      },
      orderBy: [{ year: "asc" }, { weekNumber: "asc" }],
    });

    console.log(`Retrieved ${allWeeklyHours.length} weekly hours records`);
    if (allWeeklyHours.length >= 2) {
      testResults.getBulkWeeklyHours.success = true;
      testResults.getBulkWeeklyHours.message = `Successfully retrieved ${allWeeklyHours.length} weekly hours records`;
    } else {
      testResults.getBulkWeeklyHours.message =
        "Failed to retrieve expected number of weekly hours records";
    }

    // 6. Clean up (optional, comment out to keep test data)
    console.log("Cleaning up test data...");
    await prisma.projectMemberWeeklyHours.deleteMany({
      where: {
        projectMemberId: projectMember.id,
      },
    });

    await prisma.projectMember.delete({
      where: {
        id: projectMember.id,
      },
    });

    testResults.cleanup.success = true;
    testResults.cleanup.message = "Successfully cleaned up test data";

    // Final result
    console.log("\nTEST RESULTS:");
    Object.entries(testResults).forEach(([test, result]) => {
      console.log(
        `${test}: ${result.success ? "✅ PASS" : "❌ FAIL"} - ${result.message}`
      );
    });

    const allPassed = Object.values(testResults).every(
      (result) => result.success
    );
    if (allPassed) {
      console.log(
        "\n✅ All tests passed! Weekly hours functionality is working correctly."
      );
    } else {
      console.log("\n❌ Some tests failed. Please check the logs above.");
    }
  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProjectMemberWeeklyHours().catch(console.error);
