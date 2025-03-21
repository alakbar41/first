import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Constants for dropdown options
export const FACULTIES = [
  "School of IT and Engineering",
  "School of Business",
  "School of Public and International Affairs",
  "School of Education"
] as const;

export const CANDIDATE_POSITIONS = [
  "President",
  "Vice President",
  "Senator"
] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  faculty: text("faculty").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const pendingUsers = pgTable("pending_users", {
  email: text("email").primaryKey(),
  password: text("password").notNull(),
  faculty: text("faculty").notNull(),
  otp: text("otp").notNull(),
  createdAt: timestamp("created_at").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  eligibleFaculties: text("eligible_faculties").array().notNull(),
  status: text("status").notNull().default("upcoming"), // upcoming, active, completed
  createdBy: integer("created_by").notNull(), // Reference to admin user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  studentId: text("student_id").notNull().unique(),
  faculty: text("faculty").notNull(), // Will be a dropdown selection
  position: text("position").notNull(), // Limited to: President, Vice President, Senator
  status: text("status").notNull().default("inactive"), // active (in election), inactive (not in election)
  pictureUrl: text("picture_url").default("").notNull(), // URL to candidate's picture (stored as base64)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const electionCandidates = pgTable("election_candidates", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull(), // Reference to election id
  candidateId: integer("candidate_id").notNull(), // Reference to candidate id
  runningMateId: integer("running_mate_id").notNull().default(0), // For President/VP pairs, 0 for senator elections
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPendingUserSchema = createInsertSchema(pendingUsers);

export const insertElectionSchema = createInsertSchema(elections)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    // Allow dates to be passed as ISO strings
    startDate: z.union([z.string().transform(str => new Date(str)), z.date()]),
    endDate: z.union([z.string().transform(str => new Date(str)), z.date()]),
  });

export const insertCandidateSchema = createInsertSchema(candidates)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true, // Status is automatically set based on elections
  })
  .extend({
    faculty: z.enum(FACULTIES),
    position: z.enum(CANDIDATE_POSITIONS),
    pictureUrl: z.string().optional().default(""),
  });

export const insertElectionCandidateSchema = createInsertSchema(electionCandidates).omit({
  id: true, 
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  isAdmin: z.boolean().optional()
});

// OTP verification schema
export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits")
});

// Send OTP schema
export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address")
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PendingUser = typeof pendingUsers.$inferSelect;
export type InsertPendingUser = z.infer<typeof insertPendingUserSchema>;
export type Election = typeof elections.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type ElectionCandidate = typeof electionCandidates.$inferSelect;
export type InsertElectionCandidate = z.infer<typeof insertElectionCandidateSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifySchema>;
export type SendOtpData = z.infer<typeof sendOtpSchema>;

// Reset/forgot password schema
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
