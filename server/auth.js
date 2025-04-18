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
  // Stronger session secret with crypto-based fallback
  const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

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
      httpOnly: true,
      sameSite: 'lax', // Prevents CSRF in modern browsers
      path: '/',       // Restrict cookies to root path
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
    // Removed detailed logging of sensitive information
    
    // Check if the stored password is already a bcrypt hash
    const isBcryptHash = hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$');
    
    if (!isBcryptHash) {
      console.log('WARNING: Stored password is not a bcrypt hash!');
      console.log(`Password hash starts with "${hashedPassword.substring(0, 7)}..." - this is not a valid bcrypt hash`);
      return false;
    }
    
    console.log(`comparePasswords: Comparing plain password against hash starting with "${hashedPassword.substring(0, 7)}..."`);
    
    try {
      const result = await bcrypt.compare(plainPassword, hashedPassword);
      console.log(`comparePasswords: Comparison result = ${result}`);
      return result;
    } catch (error) {
      console.error('Error during password comparison:', error.message);
      return false;
    }
  }

  // Set up Passport strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          console.log(`Login failed: User with email ${email} not found`);
          return done(null, false, { message: "Invalid login credentials" });
        }

        console.log(`Login attempt: Found user with email ${email}`);
        console.log(`Login attempt: Password hash starts with "${user.password.substring(0, 7)}..."`);
        
        const isValidPassword = await comparePasswords(password, user.password);
        console.log(`Login attempt: Password validation result = ${isValidPassword}`);

        if (!isValidPassword) {
          console.log(`Login failed: Invalid password for user ${email}`);
          return done(null, false, { message: "Invalid login credentials" });
        }

        console.log(`Login successful for user ${email}`);
        return done(null, user);
      } catch (error) {
        console.error(`Login error for ${email}:`, error);
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
  function rateLimit(key, actionMap, maxAttempts, resetTime) {
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
      resetAt: record.resetAt,
      secondsRemaining: Math.ceil((record.resetAt - now) / 1000)
    };
  }

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, faculty } = req.body;
      
      // Validate email is from ADA University
      // Convert email to lowercase for case-insensitive checking
      const normalizedEmail = email.toLowerCase();
      if (!normalizedEmail.endsWith('@ada.edu.az')) {
        return res.status(400).json({ message: "Registration requires an ADA University email address." });
      }
      
      // Check if user already exists, but DON'T reveal this information
      // Just silently handle it differently
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // To prevent user enumeration, don't disclose that this email exists
        // instead, send a generic success message as if we sent OTP
        console.log("Registration attempt for existing email - security measure activated");
        return res.status(200).json({ 
          message: "Registration initiated. Please verify your email. Check your inbox for verification code."
        });
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
        message: "Registration initiated. Please verify your email. Check your inbox for verification code."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration." });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const key = email.toLowerCase(); // Normalize the email
      
      // Apply rate limiting
      const limit = rateLimit(key, otpRequests, 3, 60 * 1000); // 3 attempts per minute
      
      if (limit.limited) {
        return res.status(429).json({ 
          message: `Too many OTP requests. Please try again in ${limit.secondsRemaining} seconds.`,
          retryAfter: limit.secondsRemaining
        });
      }
      
      // Get pending user
      const pendingUser = await storage.getPendingUserByEmail(email);
      
      // Security improvement: Don't reveal if no pending registration exists
      if (!pendingUser) {
        // Return a generic success message, even though we didn't actually send anything
        // This prevents attackers from determining which emails have pending registrations
        console.log("OTP requested for non-existent pending user - security measure activated");
        return res.status(200).json({ message: "If a verification is pending for this email, a new code has been sent." });
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
      
      // Security improvement: Use a consistent error message for all verification failures
      const genericErrorMessage = "Verification failed. Please ensure your email and verification code are correct.";
      
      if (!pendingUser) {
        // Don't reveal that no pending registration exists
        console.log("OTP verification attempted for non-existent pending user");
        return res.status(401).json({ message: genericErrorMessage });
      }
      
      // Check if OTP expired (3 minutes)
      if (Date.now() - pendingUser.createdAt.getTime() > OTP_EXPIRY_TIME) {
        await storage.deletePendingUser(email);
        return res.status(401).json({ message: genericErrorMessage });
      }
      
      // Verify OTP
      if (pendingUser.otp !== otp) {
        return res.status(401).json({ message: genericErrorMessage });
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
      
      // Log user in with session rotation for security
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login error after OTP verification:", err);
          return res.status(500).json({ message: "An error occurred during login." });
        }
        
        // Security enhancement: Regenerate session ID on new user login to prevent session fixation
        req.session.regenerate((regErr) => {
          if (regErr) {
            console.error("Session regeneration error:", regErr);
            return res.status(500).json({ message: "An error occurred during login." });
          }
          
          // Need to re-login user after session regeneration
          req.login(newUser, (loginErr) => {
            if (loginErr) {
              console.error("Re-login after session regeneration error:", loginErr);
              return res.status(500).json({ message: "An error occurred during login." });
            }
            
            console.log("New user login successful with session rotation");
            res.status(200).json(newUser);
          });
        });
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "An error occurred during verification." });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    const { email, password } = req.body;
    
    // Reduce verbosity of logs to prevent leaking sensitive information
    // Just log that an attempt was made without the actual email
    console.log("Login attempt received");
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    // Use email as the rate limiting key instead of IP
    const key = email.toLowerCase(); // Normalize the email for consistent keys
    
    // Apply rate limiting
    const limit = rateLimit(key, loginAttempts, 5, 5 * 60 * 1000); // 5 attempts per 5 minutes
    
    if (limit.limited) {
      // Note: We're still showing the remaining time, which could be used to confirm a user exists
      // In a real high-security system, you might want to use a generic error without timing info
      return res.status(429).json({ 
        message: `Too many login attempts. Please try again in ${Math.floor(limit.secondsRemaining / 60)} minutes and ${limit.secondsRemaining % 60} seconds.`,
        retryAfter: limit.secondsRemaining
      });
    }
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        // Increment failed attempts count
        rateLimit(key, loginAttempts, 5, 5 * 60 * 1000);
        // Log failed authentication without the email to improve security
        console.log("Authentication failed - invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid login credentials" });
      }
      
      // Check if this is an admin login attempt
      const { isAdmin } = req.body;
      
      if (isAdmin !== undefined && isAdmin !== user.isAdmin) {
        // User is trying to login with wrong account type
        rateLimit(key, loginAttempts, 5, 5 * 60 * 1000);
        // Log wrong account type attempt without details
        console.log("User attempted to log in with wrong account type");
        return res.status(401).json({ message: "Invalid login credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        // Security enhancement: Regenerate session ID on login to prevent session fixation
        req.session.regenerate((regErr) => {
          if (regErr) {
            console.error("Session regeneration error:", regErr);
            return next(regErr);
          }
          
          // Need to re-login user after session regeneration
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Re-login after session regeneration error:", loginErr);
              return next(loginErr);
            }
            
            // Reset login attempts on successful login
            loginAttempts.delete(key);
            // Log success without revealing the email address
            console.log("Login successful with session rotation");
            
            return res.status(200).json(user);
          });
        });
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
  
  // Password change endpoint for logged-in users with session rotation
  app.post("/api/password/change", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate input using schema (imported from shared/schema.ts)
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      // Check if new password contains at least one uppercase letter
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ message: "New password must contain at least one uppercase letter" });
      }
      
      // Check if new password contains at least one lowercase letter
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ message: "New password must contain at least one lowercase letter" });
      }
      
      // Check if new password contains at least one number
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ message: "New password must contain at least one number" });
      }
      
      // Check if new password contains at least one special character
      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({ message: "New password must contain at least one special character" });
      }
      
      // Get user
      const user = await storage.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const passwordMatches = await comparePasswords(currentPassword, user.password);
      if (!passwordMatches) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUserPassword(user.email, hashedPassword);
      
      // Security enhancement: Regenerate session after password change
      req.session.regenerate((regErr) => {
        if (regErr) {
          console.error("Session regeneration error:", regErr);
          return res.status(500).json({ message: "An error occurred during password change" });
        }
        
        // Need to re-login user after session regeneration
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Re-login after session regeneration error:", loginErr);
            return res.status(500).json({ message: "An error occurred during password change" });
          }
          
          // Update last activity timestamp for inactivity timeout
          req.session.lastActivity = Date.now();
          console.log("Password successfully changed with session rotation");
          
          res.status(200).json({ message: "Password updated successfully" });
        });
      });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "An error occurred during password change" });
    }
  });
}
