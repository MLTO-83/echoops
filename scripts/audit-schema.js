/**
 * Database Schema Audit Script
 *
 * This script performs a comprehensive audit of the Prisma schema and database,
 * checking for potential issues, missing indexes, and unused fields.
 * Run it regularly to maintain schema quality and detect potential problems.
 */

const { PrismaClient } = require("../prisma/app/generated/prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");

async function auditSchema() {
  console.log("Starting Prisma Schema Audit...");
  console.log("==============================\n");

  const results = {
    emptyTables: [],
    tablesWithoutIndexes: [],
    unusedFields: [],
    nullValueFields: {},
    missingRelationIndexes: [],
    redundantIndexes: [],
    incompleteRelations: [],
    databaseSize: {},
    recommendations: [],
  };

  try {
    // 1. Get database statistics
    console.log("Analyzing database statistics...");

    // Get all tables with proper case sensitivity
    const tables = await prisma.$queryRaw`
      SELECT table_name as tablename 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`Found ${tables.length} tables in the database`);

    // Check each table for row count and size
    for (const tableRow of tables) {
      const tableName = tableRow.tablename;
      console.log(`Processing table: ${tableName}`);

      try {
        // Get row count - using string interpolation since we need to quote identifiers
        const countQuery = `SELECT COUNT(*) as count FROM "${tableName}";`;
        const countResult = await prisma.$queryRawUnsafe(countQuery);
        const count = parseInt(countResult[0].count);

        // Get table size - using string interpolation for regclass identifier
        const sizeQuery = `
          SELECT 
            pg_size_pretty(pg_total_relation_size('"${tableName}"'::regclass)) as size,
            pg_total_relation_size('"${tableName}"'::regclass) as bytes;
        `;
        const sizeResult = await prisma.$queryRawUnsafe(sizeQuery);

        // Store results
        results.databaseSize[tableName] = {
          rowCount: count,
          size: sizeResult[0].size,
          bytes: parseInt(sizeResult[0].bytes),
        };

        // Check for empty tables
        if (count === 0) {
          results.emptyTables.push(tableName);
        }

        console.log(
          `Table ${tableName}: ${count} rows, Size: ${sizeResult[0].size}`
        );
      } catch (tableError) {
        console.error(`Error processing table ${tableName}:`, tableError);
      }
    }

    // 2. Check for tables without indexes
    console.log("\nChecking for tables without indexes...");

    for (const tableRow of tables) {
      const tableName = tableRow.tablename;

      // Skip certain system tables
      if (tableName.startsWith("_") || tableName.startsWith("pg_")) {
        continue;
      }

      try {
        // Get indexes for this table - using parameters properly
        const indexesQuery = `
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1;
        `;
        const indexes = await prisma.$queryRawUnsafe(indexesQuery, tableName);

        if (indexes.length <= 1) {
          // Only primary key index
          results.tablesWithoutIndexes.push(tableName);
          console.log(`Table ${tableName} has no secondary indexes`);
        }
      } catch (indexError) {
        console.error(
          `Error checking indexes for table ${tableName}:`,
          indexError
        );
      }
    }

    // 3. Check for missing indexes on foreign key relationships
    console.log("\nChecking for missing foreign key indexes...");

    const foreignKeys = await prisma.$queryRaw`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `;

    // Get all existing indexes
    const allIndexes = await prisma.$queryRaw`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        array_agg(a.attname) AS column_names
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
      GROUP BY
        t.relname,
        i.relname
      ORDER BY
        t.relname,
        i.relname;
    `;

    // Check each foreign key to see if it has an index
    for (const fk of foreignKeys) {
      const hasIndex = allIndexes.some((idx) => {
        // Check if this index covers our foreign key column - case insensitive comparison for safety
        return (
          idx.table_name.toLowerCase() === fk.table_name.toLowerCase() &&
          idx.column_names.some(
            (col) => col.toLowerCase() === fk.column_name.toLowerCase()
          )
        );
      });

      if (!hasIndex) {
        results.missingRelationIndexes.push({
          table: fk.table_name,
          column: fk.column_name,
          referencedTable: fk.foreign_table_name,
          referencedColumn: fk.foreign_column_name,
        });

        console.log(
          `Missing index on foreign key: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`
        );
      }
    }

    // 4. Check for fields with all null values (potentially unused)
    console.log("\nChecking for potentially unused fields (all nulls)...");

    for (const tableRow of tables) {
      const tableName = tableRow.tablename;

      // Skip certain system tables and empty tables
      if (
        tableName.startsWith("_") ||
        results.emptyTables.includes(tableName)
      ) {
        continue;
      }

      try {
        // Get column information
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          AND table_schema = 'public';
        `;
        const columns = await prisma.$queryRawUnsafe(columnsQuery, tableName);

        results.nullValueFields[tableName] = [];

        for (const column of columns) {
          // Skip primary key columns and certain standard columns
          if (
            column.column_name === "id" ||
            column.column_name === "createdAt" ||
            column.column_name === "updatedAt"
          ) {
            continue;
          }

          // For tables with data, check for columns that are all NULL
          if (results.databaseSize[tableName].rowCount > 0) {
            // Need to use string interpolation for quoting column names properly
            const nonNullCountQuery = `
              SELECT COUNT(*) as count FROM "${tableName}" 
              WHERE "${column.column_name}" IS NOT NULL;
            `;
            const nonNullCount = await prisma.$queryRawUnsafe(
              nonNullCountQuery
            );

            if (
              parseInt(nonNullCount[0].count) === 0 &&
              column.is_nullable === "YES"
            ) {
              results.nullValueFields[tableName].push(column.column_name);
              console.log(
                `Table ${tableName}: Column "${column.column_name}" has all NULL values`
              );
            }
          }
        }

        // Remove entry if no null value fields
        if (results.nullValueFields[tableName].length === 0) {
          delete results.nullValueFields[tableName];
        }
      } catch (columnError) {
        console.error(
          `Error checking columns for table ${tableName}:`,
          columnError
        );
      }
    }

    // 5. Generate recommendations based on findings
    console.log("\nGenerating recommendations...");

    // Recommend indexes for foreign keys
    for (const missingIndex of results.missingRelationIndexes) {
      results.recommendations.push({
        type: "ADD_INDEX",
        priority: "HIGH",
        description: `Add index to foreign key column "${missingIndex.column}" in table "${missingIndex.table}"`,
        details: `This column references ${missingIndex.referencedTable}.${missingIndex.referencedColumn}`,
        sql: `CREATE INDEX IF NOT EXISTS "idx_${missingIndex.table}_${missingIndex.column}" ON "${missingIndex.table}"("${missingIndex.column}");`,
      });
    }

    // Recommend reviewing unused fields
    for (const tableName in results.nullValueFields) {
      const unusedFields = results.nullValueFields[tableName];
      if (unusedFields.length > 0) {
        results.recommendations.push({
          type: "REVIEW_UNUSED_FIELDS",
          priority: "MEDIUM",
          description: `Review unused fields in table "${tableName}"`,
          details: `The following columns contain only NULL values: ${unusedFields.join(
            ", "
          )}`,
          schema: `Consider removing these fields or adding default values if they're needed`,
        });
      }
    }

    // Recommend reviewing empty tables
    for (const emptyTable of results.emptyTables) {
      results.recommendations.push({
        type: "REVIEW_EMPTY_TABLE",
        priority: "LOW",
        description: `Review empty table "${emptyTable}"`,
        details: `This table exists but contains no data`,
        schema: `Consider if this table is needed or if it should be populated`,
      });
    }

    // Write findings to a report file
    const reportDate = new Date().toISOString().split("T")[0];
    const reportPath = path.join(
      __dirname,
      `../prisma/schema-audit-${reportDate}.json`
    );

    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log(`\nAudit complete! Report saved to ${reportPath}`);
    console.log(`Found ${results.recommendations.length} recommendations`);

    // Print summary of high priority recommendations
    const highPriorityRecs = results.recommendations.filter(
      (r) => r.priority === "HIGH"
    );
    if (highPriorityRecs.length > 0) {
      console.log("\nHigh Priority Recommendations:");
      highPriorityRecs.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.description}`);
        if (rec.sql) console.log(`   SQL: ${rec.sql}`);
      });
    }

    return results;
  } catch (error) {
    console.error("Error during schema audit:", error);
    console.error("Error details:", error.meta || {});
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
auditSchema().catch(console.error);
