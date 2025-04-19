import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Strong password validation schema
// Requires at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
export const strongPasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Constants for dropdown options
export const FACULTY_ABBREVIATIONS = {
  "SITE": "School of IT and Engineering",
  "SB": "School of Business", // Changed from BSCS to SB
  "SPIA": "School of Public and International Affairs", 
  "SESD": "School of Education and Social Development" // Changed from SEDU to SESD
} as const;

// Array of faculty abbreviations for dropdowns
export const FACULTY_CODES = ["SITE", "SB", "SPIA", "SESD"] as const;

// Array of full faculty names
export const FACULTIES = Object.values(FACULTY_ABBREVIATIONS) as readonly string[];

// Function to get faculty code from full name or vice versa
export function getFacultyCode(facultyName: string): string {
  // First check if it's already a code
  if (FACULTY_CODES.includes(facultyName as any)) {
    return facultyName;
  }
  
  // Convert from full name to code
  const entry = Object.entries(FACULTY_ABBREVIATIONS).find(([_, name]) => name === facultyName);
  return entry ? entry[0] : facultyName;
}

// Function to get faculty full name from code
export function getFacultyName(facultyCode: string): string {
  // First check if it's a code
  if (FACULTY_CODES.includes(facultyCode as any)) {
    return FACULTY_ABBREVIATIONS[facultyCode as keyof typeof FACULTY_ABBREVIATIONS];
  }
  
  // If it's already a full name, return it
  if (FACULTIES.includes(facultyCode)) {
    return facultyCode;
  }
  
  // If we can't find a match, return the original
  return facultyCode;
}

// Position types that align with the blockchain contract enum
// Positions in the contract: enum PositionType { Senator, PresidentVP }
export const BLOCKCHAIN_POSITIONS = ["Senator", "President/VP"] as const;

// User-facing candidate positions
export const CANDIDATE_POSITIONS = [
  "President",
  "Vice President",
  "Senator"
] as [string, ...string[]];

// Map from database position to blockchain position enum index
export function mapPositionToBlockchain(position: string): number {
  if (position === "Senator") {
    return 0; // Senator enum value
  } else {
    return 1; // PresidentVP enum value (for both President and Vice President)
  }
}

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
  type: text("type").notNull().default("registration"), // "registration" or "reset"
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
  blockchainId: integer("blockchain_id"), // Stores the start timestamp used as election identifier in blockchain
});

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  studentId: text("student_id").notNull().unique(),
  faculty: text("faculty").notNull(), // Will be a dropdown selection
  position: text("position").notNull(), // Limited to: President, Vice President, Senator
  status: text("status").notNull().default("inactive"), // active (in ongoing election), pending (in upcoming election), inactive (not in election)
  pictureUrl: text("picture_url").default("").notNull(), // URL to candidate's picture (stored as base64)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  blockchainHash: text("blockchain_hash"), // Stores the bytes32 hash of the student ID for blockchain identification
});

export const electionCandidates = pgTable("election_candidates", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull(), // Reference to election id
  candidateId: integer("candidate_id").notNull(), // Reference to candidate id
  runningMateId: integer("running_mate_id").notNull().default(0), // For President/VP pairs, 0 for senator elections
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Table for one-time voting tokens
// This provides secure voting by requiring a valid token
export const votingTokens = pgTable("voting_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Reference to user id
  electionId: integer("election_id").notNull(), // Reference to election id
  token: text("token").notNull().unique(), // Unique token generated per student per election
  used: boolean("used").notNull().default(false), // Whether the token has been used
  expiresAt: timestamp("expires_at").notNull(), // Token expiration time
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  // Apply strong password validation for new user registrations
  password: strongPasswordSchema,
});

export const insertPendingUserSchema = createInsertSchema(pendingUsers)
  .extend({
    type: z.enum(["registration", "reset"]).default("registration")
  });

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
    fullName: z.string().min(3, "Full name is required"),
    studentId: z.string()
      .regex(/^\d{9}$/, "Student ID must be exactly 9 digits")
      .refine(val => /^\d+$/.test(val), "Student ID must contain only numbers"),
    faculty: z.string(), // Accept full faculty name or code
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

// Schema for validating password update
export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
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
export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;



// Reset/forgot password schema with enhanced validation
export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: strongPasswordSchema,
});

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// Voting token schema and type
export const votingTokenSchema = createInsertSchema(votingTokens)
  .omit({
    id: true,
    createdAt: true,
    used: true,
  });

export type VotingToken = typeof votingTokens.$inferSelect;
export type InsertVotingToken = z.infer<typeof votingTokenSchema>;

// Schema for token request and verification
export const tokenRequestSchema = z.object({
  electionId: z.number(),
});

export const tokenVerifySchema = z.object({
  token: z.string(),
  electionId: z.number(),
  candidateId: z.number(),
});

export type TokenRequestData = z.infer<typeof tokenRequestSchema>;
export type TokenVerifyData = z.infer<typeof tokenVerifySchema>;

// Support ticket system
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Reference to user id
  title: text("title").notNull(), // Ticket title
  description: text("description").notNull(), // Detailed description
  type: text("type").notNull(), // Ticket type: 'concern', 'suggestion', 'other'
  status: text("status").notNull().default("open"), // Status: 'open', 'in_progress', 'resolved'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ticket schema and types
export const insertTicketSchema = createInsertSchema(tickets)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    status: true, // Status is set automatically for new tickets
    userId: true, // UserId is set from the current user
  })
  .extend({
    // Add type validation
    type: z.enum(["concern", "suggestion", "other"]),
  });

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Schema for updating ticket status (admin only)
export const updateTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>;
