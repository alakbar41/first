import { db } from './server/db';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  try {
    console.log('Starting database reset...');
    
    // Drop all existing tables in reverse order to avoid foreign key constraints
    console.log('Dropping existing tables...');
    await db.execute(sql`DROP TABLE IF EXISTS "voting_tokens" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "election_candidates" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "tickets" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "candidates" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "elections" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "pending_users" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE;`);
    
    console.log('Creating tables from schema definitions...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "faculty" TEXT NOT NULL,
        "is_admin" BOOLEAN NOT NULL DEFAULT false
      );
    `);
    
    // Create pending_users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pending_users" (
        "email" TEXT PRIMARY KEY,
        "password" TEXT NOT NULL,
        "faculty" TEXT NOT NULL,
        "otp" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL,
        "is_admin" BOOLEAN NOT NULL DEFAULT false,
        "type" TEXT NOT NULL DEFAULT 'registration'
      );
    `);
    
    // Create elections table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "elections" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "position" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "eligible_faculties" TEXT[] NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'upcoming',
        "created_by" INTEGER NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "blockchain_id" INTEGER
      );
    `);
    
    // Create candidates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "candidates" (
        "id" SERIAL PRIMARY KEY,
        "full_name" TEXT NOT NULL,
        "student_id" TEXT NOT NULL UNIQUE,
        "faculty" TEXT NOT NULL,
        "position" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'inactive',
        "picture_url" TEXT NOT NULL DEFAULT '',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create election_candidates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "election_candidates" (
        "id" SERIAL PRIMARY KEY,
        "election_id" INTEGER NOT NULL,
        "candidate_id" INTEGER NOT NULL,
        "running_mate_id" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create voting_tokens table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "voting_tokens" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "election_id" INTEGER NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'open',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('Creating admin user...');
    const hashedPassword = await hashPassword('Admin123@');
    
    // Insert admin user
    await db.execute(sql`
      INSERT INTO "users" ("email", "password", "faculty", "is_admin")
      VALUES ('admin@ada.edu.az', ${hashedPassword}, 'SITE', true)
    `);
    
    console.log('Database reset completed successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}

main().catch(console.error);