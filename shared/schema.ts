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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertPendingUserSchema = createInsertSchema(pendingUsers);

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
export type LoginData = z.infer<typeof loginSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifySchema>;
export type SendOtpData = z.infer<typeof sendOtpSchema>;
