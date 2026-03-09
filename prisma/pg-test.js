// Direct PostgreSQL connection test
const { Client } = require("pg");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env.local"),
});

async function testConnection() {
  // Get the connection string from .env.local
  const connectionString = process.env.DATABASE_URL;
  console.log("Testing connection to PostgreSQL with URL from .env.local");

  // Create a new PostgreSQL client
  const client = new Client({ connectionString });

  try {
    // Connect to the database
    await client.connect();
    console.log("✅ Successfully connected to PostgreSQL");

    // Run a simple query
    const result = await client.query(
      "SELECT current_database(), current_user"
    );
    console.log("Database:", result.rows[0].current_database);
    console.log("User:", result.rows[0].current_user);

    // Close the connection
    await client.end();
    console.log("Connection closed");
  } catch (error) {
    console.error("❌ Error connecting to PostgreSQL:", error.message);
  }
}

testConnection();
