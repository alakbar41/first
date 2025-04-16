/**
 * Migration script to add blockchain_id column to elections table
 */
const { Pool } = require('pg');

// Use the same DATABASE_URL from environment variables
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

async function main() {
  try {
    console.log("Starting database migration to add blockchain_id column to elections table...");
    
    // Check if column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='elections' AND column_name='blockchain_id';
    `;
    const checkResult = await pool.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log("Column blockchain_id already exists in elections table. No action needed.");
      return;
    }
    
    // Add the blockchain_id column
    const addColumnQuery = `
      ALTER TABLE elections
      ADD COLUMN blockchain_id INTEGER;
    `;
    
    await pool.query(addColumnQuery);
    console.log("Successfully added blockchain_id column to elections table.");
    
  } catch (error) {
    console.error("Error in migration:", error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the migration
main();