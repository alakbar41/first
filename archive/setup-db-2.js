import { pool } from "./server/db.ts";
import bcrypt from "bcrypt";

async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function setupDatabase() {
  try {
    console.log("Starting database setup...");
    
    // Drop existing tables in the correct order to avoid foreign key constraints
    console.log("Dropping existing tables if they exist...");
    await pool.query('DROP TABLE IF EXISTS voting_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS election_candidates CASCADE');
    await pool.query('DROP TABLE IF EXISTS tickets CASCADE');
    await pool.query('DROP TABLE IF EXISTS candidates CASCADE');
    await pool.query('DROP TABLE IF EXISTS elections CASCADE');
    await pool.query('DROP TABLE IF EXISTS pending_users CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create tables from schema
    console.log("Creating users table...");
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        faculty TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false
      )
    `);
    
    console.log("Creating pending_users table...");
    await pool.query(`
      CREATE TABLE pending_users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        faculty TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        type TEXT NOT NULL DEFAULT 'registration'
      )
    `);
    
    console.log("Creating elections table...");
    await pool.query(`
      CREATE TABLE elections (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT NOT NULL,
        description TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        eligible_faculties TEXT[] NOT NULL,
        status TEXT NOT NULL DEFAULT 'upcoming',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        blockchain_id INTEGER
      )
    `);
    
    console.log("Creating candidates table...");
    await pool.query(`
      CREATE TABLE candidates (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        student_id TEXT NOT NULL UNIQUE,
        faculty TEXT NOT NULL,
        position TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'inactive',
        picture_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("Creating election_candidates table...");
    await pool.query(`
      CREATE TABLE election_candidates (
        id SERIAL PRIMARY KEY,
        election_id INTEGER NOT NULL,
        candidate_id INTEGER NOT NULL,
        running_mate_id INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("Creating voting_tokens table...");
    await pool.query(`
      CREATE TABLE voting_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        election_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        used BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("Creating tickets table...");
    await pool.query(`
      CREATE TABLE tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create the admin account
    console.log("Creating admin account...");
    const hashedPassword = await hashPassword("Admin123@");
    await pool.query(`
      INSERT INTO users (email, password, faculty, is_admin)
      VALUES ('admin@ada.edu.az', $1, 'Administration', true)
    `, [hashedPassword]);
    
    console.log("Database setup completed successfully!");
    
  } catch (error) {
    console.error("Error setting up database:", error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
    console.log("Database connection closed");
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log("Database setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exit(1);
  });