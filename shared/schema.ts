// SPDX-License-Identifier: MIT
import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Strong password validation ---
export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );

// --- Faculty Constants ---
export const FACULTY_ABBREVIATIONS = {
  SITE: "School of IT and Engineering",
  SB: "School of Business",
  SPIA: "School of Public and International Affairs",
  SESD: "School of Education and Social Development",
} as const;

export const FACULTY_CODES = Object.keys(FACULTY_ABBREVIATIONS) as const;
export const FACULTIES = Object.values(FACULTY_ABBREVIATIONS) as const;

export function getFacultyCode(facultyName: string): string {
  if (FACULTY_CODES.includes(facultyName as any)) return facultyName;
  const entry = Object.entries(FACULTY_ABBREVIATIONS).find(
    ([_, name]) => name === facultyName,
  );
  return entry ? entry[0] : facultyName;
}

export function getFacultyName(facultyCode: string): string {
  if (FACULTY_CODES.includes(facultyCode as any))
    return FACULTY_ABBREVIATIONS[
      facultyCode as keyof typeof FACULTY_ABBREVIATIONS
    ];
  if (FACULTIES.includes(facultyCode as any)) return facultyCode;
  return facultyCode;
}

export const CANDIDATE_POSITIONS = [
  "President",
  "Vice President",
  "Senator",
] as const;

// --- User and Admin Tables ---
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
  type: text("type").notNull().default("registration"),
});

// --- Blockchain-Aligned Election Table ---
export const elections = pgTable("elections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time").notNull().unique(),
  endTime: timestamp("end_time").notNull(),
  eligibleFaculties: text("eligible_faculties").array().notNull(),
  status: text("status").notNull().default("upcoming"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Candidate Table ---
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  studentId: text("student_id").notNull().unique(),
  faculty: text("faculty").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull().default("inactive"),
  pictureUrl: text("picture_url").default("").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Election-Candidate Link Table ---
export const electionCandidates = pgTable("election_candidates", {
  id: serial("id").primaryKey(),
  electionStartTime: timestamp("election_start_time").notNull(),
  candidateStudentId: text("candidate_student_id").notNull(),
  runningMateStudentId: text("running_mate_student_id"), // nullable for senator elections
  compositeId: text("composite_id"), // for president-vp pairs
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- One-Time Voting Tokens Table ---
export const votingTokens = pgTable("voting_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  electionStartTime: timestamp("election_start_time").notNull(),
  token: text("token").notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- Support Tickets ---
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Zod Schemas & Type Definitions ---
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true })
  .extend({ password: strongPasswordSchema });
export const insertPendingUserSchema = createInsertSchema(pendingUsers).extend({
  type: z.enum(["registration", "reset"]).default("registration"),
});
export const insertElectionSchema = createInsertSchema(elections).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.union([z.date(), z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'startTime must be a valid date string',
  })]),
  endTime: z.union([z.date(), z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'endTime must be a valid date string',
  })])
});
export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export const insertElectionCandidateSchema = createInsertSchema(
  electionCandidates,
).omit({ id: true, createdAt: true });
export const votingTokenSchema = createInsertSchema(votingTokens).omit({
  id: true,
  createdAt: true,
  used: true,
});
export const insertTicketSchema = createInsertSchema(tickets)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true,
    userId: true,
  })
  .extend({ type: z.enum(["concern", "suggestion", "other"]) });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  isAdmin: z.boolean().optional(),
});
export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});
export const otpVerifySchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});
export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: strongPasswordSchema,
});
export const tokenRequestSchema = z.object({ electionId: z.number() });
export const tokenVerifySchema = z.object({
  token: z.string(),
  electionId: z.number(),
  candidateId: z.number(),
});
export const updateTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PendingUser = typeof pendingUsers.$inferSelect;
export type InsertPendingUser = z.infer<typeof insertPendingUserSchema>;
export type Election = typeof elections.$inferSelect;
export type InsertElection = z.infer<typeof insertElectionSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type ElectionCandidate = typeof electionCandidates.$inferSelect;
export type InsertElectionCandidate = z.infer<
  typeof insertElectionCandidateSchema
>;
export type VotingToken = typeof votingTokens.$inferSelect;
export type InsertVotingToken = z.infer<typeof votingTokenSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifySchema>;
export type SendOtpData = z.infer<typeof sendOtpSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type TokenRequestData = z.infer<typeof tokenRequestSchema>;
export type TokenVerifyData = z.infer<typeof tokenVerifySchema>;
export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>;
