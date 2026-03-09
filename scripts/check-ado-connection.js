// Check ADO connection details
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    // Get the exact connection ID from the project
    const project = await prisma.project.findUnique({
      where: { id: "cm9oa84fs0002qbz43q5bgupt" },
    });

    console.log("Project:", project);

    if (!project) {
      console.log("Project not found!");
      return;
    }

    // Use the exact connection ID from the project record
    const connectionId = project.adoConnectionId;
    console.log(`Looking up ADO connection with ID: ${connectionId}`);

    // Find the ADO connection by the exact ID from the project
    // Corrected case: Using ADOConnection instead of aDOConnection
    const connection = await prisma.ADOConnection.findUnique({
      where: { id: connectionId },
    });

    console.log(
      "ADO Connection:",
      connection
        ? {
            id: connection.id,
            organizationId: connection.organizationId,
            adoOrganizationUrl: connection.adoOrganizationUrl,
            patExists: !!connection.pat,
            createdAt: connection.createdAt,
            updatedAt: connection.updatedAt,
          }
        : "Not found"
    );

    // Check the organization that owns the connection
    if (connection) {
      const organization = await prisma.organization.findUnique({
        where: { id: connection.organizationId },
      });

      console.log("Organization:", organization);

      // Now test if we can access the ADO API with this connection
      console.log("Testing ADO API access...");

      // Format the ADO URL properly
      const orgUrlTrimmed = connection.adoOrganizationUrl.endsWith("/")
        ? connection.adoOrganizationUrl.slice(0, -1)
        : connection.adoOrganizationUrl;

      // Use the actual project ADO ID
      const adoProjectId = project.adoProjectId;

      // Construct the ADO teams API URL
      const teamsUrl = `${orgUrlTrimmed}/_apis/projects/${adoProjectId}/teams?api-version=7.0`;
      console.log(`API URL: ${teamsUrl}`);

      try {
        // Import fetch properly for Node.js environment
        const fetch = (...args) =>
          import("node-fetch").then(({ default: fetch }) => fetch(...args));

        const response = await fetch(teamsUrl, {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${connection.pat}`).toString(
              "base64"
            )}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(
            `API call successful! Found ${data.value?.length || 0} teams.`
          );
          console.log(
            "Teams:",
            data.value.map((team) => team.name)
          );
        } else {
          const errorText = await response.text();
          console.error(
            `API call failed with status ${response.status}: ${errorText}`
          );
        }
      } catch (apiError) {
        console.error("Error making ADO API call:", apiError);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
