import * as schema from './shared/schema';
import { db } from './server/db';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('Starting database setup...');
  
  try {
    // Drop all existing tables (clean slate)
    console.log('Dropping existing tables...');
    
    // Drop in reverse order to handle dependencies
    await db.execute(sql`DROP TABLE IF EXISTS voting_tokens CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS election_candidates CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS tickets CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS candidates CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS elections CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS pending_users CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE;`);
    
    // Recreate tables with schema
    console.log('Creating tables from schema...');
    
    // Create tables in the correct order
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        faculty TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pending_users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        faculty TEXT NOT NULL,
        otp TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        type TEXT NOT NULL DEFAULT 'registration'
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS elections (
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
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS candidates (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        student_id TEXT NOT NULL UNIQUE,
        faculty TEXT NOT NULL,
        position TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'inactive',
        picture_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS election_candidates (
        id SERIAL PRIMARY KEY,
        election_id INTEGER NOT NULL,
        candidate_id INTEGER NOT NULL,
        running_mate_id INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS voting_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        election_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        used BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create the admin user
    console.log('Creating admin user...');
    const hashedPassword = await hashPassword('Admin123@');
    await db.execute(sql`
      INSERT INTO users (email, password, faculty, is_admin)
      VALUES ('admin@ada.edu.az', ${hashedPassword}, 'SITE', true)
    `);

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

main();