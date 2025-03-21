import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  studentId: text("student_id").notNull().unique(),
  faculty: text("faculty").notNull(),
  positionContested: text("position_contested").notNull(), // President, Vice President, Senator
  participationStatus: text("participation_status").notNull().default("inactive"), // active, upcoming, inactive
  picture: text("picture").notNull().default("default.png"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const electionCandidates = pgTable("election_candidates", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull(), // Reference to election id
  candidateId: integer("candidate_id").notNull(), // Reference to candidate id
  runningMateId: integer("running_mate_id"), // For President/VP pairs, null for senator elections
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

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
