// scripts/check-ado-database.js
const fs = require("fs");
const path = require("path");

// Use production path for server deployment
const prismaPath = "/var/www/portavi/prisma/app/generated/prisma/client";

const { PrismaClient } = require(prismaPath);

// Initialize Prisma client
const prisma = new PrismaClient();

async function checkAdoDatabase() {
  console.log("=== Checking ADO Database Content ===\n");

  try {
    // Get all ADO connections
    console.log("1. Checking all ADO connections...");
    const allAdoConnections = await prisma.aDOConnection.findMany();

    console.log(`Found ${allAdoConnections.length} ADO connections:`);
    allAdoConnections.forEach((connection, index) => {
      console.log(`\n   Connection ${index + 1}:`);
      console.log(`     ID: ${connection.id}`);
      console.log(`     Organization URL: ${connection.adoOrganizationUrl}`);
      console.log(
        `     Personal Access Token: ${connection.pat ? `***${connection.pat.slice(-4)}` : "NULL/EMPTY"}`
      );
      console.log(
        `     PAT Length: ${connection.pat ? connection.pat.length : 0} characters`
      );
      console.log(`     Created At: ${connection.createdAt}`);
      console.log(`     Updated At: ${connection.updatedAt}`);
    });

    // Check the specific ADO connection you mentioned
    console.log(
      `\n2. Checking specific ADO connection: cma69eka000016cfw69y35cho`
    );
    const specificConnection = await prisma.aDOConnection.findUnique({
      where: { id: "cma69eka000016cfw69y35cho" },
    });

    if (specificConnection) {
      console.log("   ✅ Found specific connection:");
      console.log(`     ID: ${specificConnection.id}`);
      console.log(
        `     Organization URL: ${specificConnection.adoOrganizationUrl}`
      );
      console.log(
        `     Personal Access Token: ${specificConnection.pat ? `***${specificConnection.pat.slice(-4)}` : "NULL/EMPTY"}`
      );
      console.log(
        `     PAT Length: ${specificConnection.pat ? specificConnection.pat.length : 0} characters`
      );
      console.log(`     PAT Type: ${typeof specificConnection.pat}`);

      if (specificConnection.pat) {
        console.log(
          `     PAT starts with: ${specificConnection.pat.substring(0, 10)}...`
        );
      }
    } else {
      console.log("   ❌ Specific connection not found");
    }

    // Check which connection findFirst() is returning
    console.log(`\n3. Testing findFirst() method (what the auth script uses):`);
    const firstConnection = await prisma.aDOConnection.findFirst();

    if (firstConnection) {
      console.log("   ✅ findFirst() returned:");
      console.log(`     ID: ${firstConnection.id}`);
      console.log(
        `     Organization URL: ${firstConnection.adoOrganizationUrl}`
      );
      console.log(
        `     Personal Access Token: ${firstConnection.pat ? `***${firstConnection.pat.slice(-4)}` : "NULL/EMPTY"}`
      );
      console.log(
        `     PAT Length: ${firstConnection.pat ? firstConnection.pat.length : 0} characters`
      );
    } else {
      console.log("   ❌ findFirst() returned nothing");
    }

    // Check organization relationships
    console.log(`\n4. Checking ADO connections with organizations:`);
    const connectionsWithOrgs = await prisma.aDOConnection.findMany({
      include: {
        organization: {
          include: {
            aiProviderSettings: true,
          },
        },
      },
    });

    connectionsWithOrgs.forEach((connection, index) => {
      console.log(`\n   Connection ${index + 1} with organization:`);
      console.log(`     ADO Connection ID: ${connection.id}`);
      console.log(
        `     Organization: ${connection.organization ? connection.organization.name : "No organization linked"}`
      );
      console.log(
        `     Organization ID: ${connection.organization ? connection.organization.id : "N/A"}`
      );
      console.log(
        `     AI Provider Settings: ${connection.organization?.aiProviderSettings?.length || 0} found`
      );
      console.log(
        `     PAT: ${connection.pat ? `***${connection.pat.slice(-4)}` : "NULL/EMPTY"}`
      );
    });

    // Check database schema to make sure field names are correct
    console.log(`\n5. Checking if there are any other PAT-related fields:`);
    const rawConnection = await prisma.$queryRaw`
      SELECT * FROM "ADOConnection" LIMIT 1;
    `;

    if (rawConnection && rawConnection.length > 0) {
      console.log("   Raw database fields:");
      Object.keys(rawConnection[0]).forEach((key) => {
        const value = rawConnection[0][key];
        const displayValue =
          key.toLowerCase().includes("token") ||
          key.toLowerCase().includes("password")
            ? value
              ? `***${String(value).slice(-4)}`
              : "NULL"
            : value;
        console.log(`     ${key}: ${displayValue}`);
      });
    }
  } catch (error) {
    console.log(`❌ Database check failed: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAdoDatabase().catch(console.error);
