import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage.ts";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { mailer } from "./mailer.js";

export function setupAuth(app) {
  const SALT_ROUNDS = 10;
  const OTP_EXPIRY_TIME = 3 * 60 * 1000; // 3 minutes in milliseconds
  const SESSION_SECRET = process.env.SESSION_SECRET || "ada-university-voting-system-secret";

  // Rate limiting maps
  const loginAttempts = new Map();
  const otpRequests = new Map();

  // Session setup
  const sessionSettings = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: storage.sessionStore,
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Password helpers
  async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async function comparePasswords(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Set up Passport strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "Invalid login credentials" });
        }

        const isValidPassword = await comparePasswords(password, user.password);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid login credentials" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rate limiting functions
  function rateLimit(ip, actionMap, maxAttempts, resetTime) {
    const key = ip;
    const now = Date.now();
    
    const record = actionMap.get(key) || { count: 0, resetAt: now + resetTime };
    
    // Reset counter if time expired
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + resetTime;
    } else {
      record.count += 1;
    }
    
    actionMap.set(key, record);
    
    return {
      limited: record.count > maxAttempts,
      remainingAttempts: Math.max(0, maxAttempts - record.count),
      resetAt: record.resetAt
    };
  }

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, faculty } = req.body;
      
      // Validate email is from ADA University
      if (!email.endsWith('@ada.edu.az')) {
        return res.status(400).json({ message: "Registration requires an ADA University email address." });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered." });
      }
      
      // Generate OTP and create pending user
      const otp = crypto.randomInt(100000, 1000000).toString();
      const hashedPassword = await hashPassword(password);
      
      const pendingUser = {
        email,
        password: hashedPassword,
        faculty,
        otp,
        createdAt: new Date(),
        isAdmin: false
      };
      
      await storage.createPendingUser(pendingUser);
      
      try {
        // Send OTP email
        await mailer.sendOtp(email, otp);
      } catch (emailError) {
        // Log the error but continue with registration
        console.error("Email sending failed but continuing with registration:", emailError);
      }
      
      res.status(200).json({ 
        message: "Registration initiated. Please verify your email.",
        // For development only - remove in production
        developmentOtp: process.env.NODE_ENV !== "production" ? otp : undefined
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration." });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      const ip = req.ip;
      
      // Apply rate limiting
      const limit = rateLimit(ip, otpRequests, 3, 60 * 1000); // 3 attempts per minute
      
      if (limit.limited) {
        return res.status(429).json({ 
          message: "Too many OTP requests. Please try again later.",
          retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000)
        });
      }
      
      // Get pending user
      const pendingUser = await storage.getPendingUserByEmail(email);
      if (!pendingUser) {
        return res.status(404).json({ message: "No pending registration found for this email." });
      }
      
      // Generate new OTP
      const newOtp = crypto.randomInt(100000, 1000000).toString();
      
      // Update pending user
      await storage.updatePendingUserOtp(email, newOtp);
      
      // Send OTP email
      await mailer.sendOtp(email, newOtp);
      
      res.status(200).json({ message: "Verification code sent successfully." });
    } catch (error) {
      console.error("OTP sending error:", error);
      res.status(500).json({ message: "Failed to send verification code." });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      // Get pending user
      const pendingUser = await storage.getPendingUserByEmail(email);
      
      if (!pendingUser) {
        return res.status(404).json({ message: "No pending registration found for this email." });
      }
      
      // Check if OTP expired (3 minutes)
      if (Date.now() - pendingUser.createdAt.getTime() > OTP_EXPIRY_TIME) {
        await storage.deletePendingUser(email);
        return res.status(401).json({ message: "Verification code has expired. Please request a new one." });
      }
      
      // Verify OTP
      if (pendingUser.otp !== otp) {
        return res.status(401).json({ message: "Invalid verification code." });
      }
      
      // Create verified user
      const newUser = await storage.createUser({
        email: pendingUser.email,
        password: pendingUser.password,
        faculty: pendingUser.faculty,
        isAdmin: pendingUser.isAdmin
      });
      
      // Delete pending user
      await storage.deletePendingUser(email);
      
      // Log user in
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login error after OTP verification:", err);
          return res.status(500).json({ message: "An error occurred during login." });
        }
        
        res.status(200).json(newUser);
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "An error occurred during verification." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    const ip = req.ip;
    
    // Apply rate limiting
    const limit = rateLimit(ip, loginAttempts, 5, 5 * 60 * 1000); // 5 attempts per 5 minutes
    
    if (limit.limited) {
      return res.status(429).json({ 
        message: "Too many failed login attempts. Please try again later.",
        retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000)
      });
    }
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        // Increment failed attempts count
        rateLimit(ip, loginAttempts, 5, 5 * 60 * 1000);
        return res.status(401).json({ message: info?.message || "Invalid login credentials" });
      }
      
      // Check if this is an admin login attempt
      const { isAdmin } = req.body;
      
      if (isAdmin !== undefined && isAdmin !== user.isAdmin) {
        // User is trying to login with wrong account type
        rateLimit(ip, loginAttempts, 5, 5 * 60 * 1000);
        return res.status(401).json({ message: "Invalid login credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        // Reset login attempts on successful login
        loginAttempts.delete(ip);
        
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "An error occurred during logout." });
      }
      
      res.status(200).json({ message: "Logged out successfully." });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.status(200).json(req.user);
  });
}
