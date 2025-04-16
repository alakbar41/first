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
      return false;
    }
    
    const result = await bcrypt.compare(plainPassword, hashedPassword);
    return result;
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
      
      // Basic validation
      if (!email || !password || !faculty) {
        return res.status(400).json({ message: "All fields are required." });
      }
      
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // Check if the email has the correct domain
      if (!normalizedEmail.endsWith('@ada.edu.az')) {
        return res.status(400).json({ message: "Only ADA University email addresses are allowed." });
      }
      
      // Check password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        console.log(`Registration attempted with existing email: ${normalizedEmail}`);
        return res.status(200).json({ 
          message: "Registration initiated. Please verify your email. Check your inbox for verification code."
        });
      }
      
      // Generate 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      console.log(`Generated OTP for ${normalizedEmail}: ${otp}`);
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create pending user
      const pendingUser = {
        email: normalizedEmail,
        password: hashedPassword,
        faculty,
        otp,
        createdAt: new Date(),
        isAdmin: false,
        type: 'registration'
      };
      
      // Store pending user in database
      await storage.createPendingUser(pendingUser);
      console.log(`Stored pending user for ${normalizedEmail} with OTP: ${otp}`);
      
      // Send verification email - no try/catch to simplify logic
      // Our mailer function will handle errors internally
      const emailResult = await mailer.sendOtp(normalizedEmail, otp);
      
      // Check if email might have failed
      if (emailResult.error) {
        console.log(`Note: Email might have failed, but registration can continue. Error: ${emailResult.error}`);
        console.log(`IMPORTANT - OTP for ${normalizedEmail}: ${otp}`);
      }
      
      // Always return success to the client
      res.status(200).json({ 
        message: "Registration initiated. Please verify your email. Check your inbox or console for verification code."
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration." });
    }
  });

  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Basic validation
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      // Normalize email
      const normalizedEmail = email.toLowerCase();
      
      // Check if the email has the correct domain
      if (!normalizedEmail.endsWith('@ada.edu.az')) {
        return res.status(400).json({ message: "Only ADA University email addresses are allowed." });
      }
      
      // Apply rate limiting
      const limit = rateLimit(normalizedEmail, otpRequests, 3, 60 * 1000); // 3 attempts per minute
      
      if (limit.limited) {
        return res.status(429).json({ 
          message: `Too many verification code requests. Please try again in ${limit.secondsRemaining} seconds.`
        });
      }
      
      // Check for pending user
      const pendingUser = await storage.getPendingUserByEmail(normalizedEmail);
      
      if (!pendingUser) {
        console.log(`OTP requested for non-existent pending user: ${normalizedEmail}`);
        return res.status(200).json({ 
          message: "If a verification is pending for this email, a new code has been sent." 
        });
      }
      
      // Generate new OTP
      const newOtp = crypto.randomInt(100000, 1000000).toString();
      console.log(`Generated new OTP for ${normalizedEmail}: ${newOtp}`);
      
      // Update pending user record with new OTP
      await storage.updatePendingUserOtp(normalizedEmail, newOtp);
      console.log(`Updated pending user with new OTP for ${normalizedEmail}`);
      
      // Send verification email - no try/catch since our mailer handles errors internally
      const emailResult = await mailer.sendOtp(normalizedEmail, newOtp);
      
      // Check if email might have failed
      if (emailResult.error) {
        console.log(`Note: Email might have failed, but OTP has been updated. Error: ${emailResult.error}`);
        console.log(`IMPORTANT - New OTP for ${normalizedEmail}: ${newOtp}`);
      }
      
      // Always return success
      res.status(200).json({ 
        message: "Verification code sent successfully. Check your inbox or console for the code." 
      });
    } catch (error) {
      console.error("OTP sending error:", error);
      res.status(500).json({ message: "Failed to send verification code." });
    }
  });

  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      // Basic validation
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and verification code are required" });
      }
      
      // Normalize email
      const normalizedEmail = email.toLowerCase();
      
      // Get pending user
      const pendingUser = await storage.getPendingUserByEmail(normalizedEmail);
      
      // Generic error message for security
      const genericErrorMessage = "Verification failed. Please check your email and verification code.";
      
      if (!pendingUser) {
        console.log(`Verification attempted for non-existent user: ${normalizedEmail}`);
        return res.status(401).json({ message: genericErrorMessage });
      }
      
      // Check OTP expiry (3 minutes)
      if (Date.now() - pendingUser.createdAt.getTime() > OTP_EXPIRY_TIME) {
        console.log(`OTP expired for ${normalizedEmail}`);
        await storage.deletePendingUser(normalizedEmail);
        return res.status(401).json({ message: "Verification code has expired. Please request a new code." });
      }
      
      // Verify OTP
      if (pendingUser.otp !== otp) {
        console.log(`Invalid OTP for ${normalizedEmail}: ${otp}`);
        return res.status(401).json({ message: genericErrorMessage });
      }
      
      // OTP is valid - create the actual user account
      console.log(`Creating verified user for ${normalizedEmail}`);
      const newUser = await storage.createUser({
        email: pendingUser.email,
        password: pendingUser.password,
        faculty: pendingUser.faculty,
        isAdmin: pendingUser.isAdmin
      });
      
      // Delete pending user
      await storage.deletePendingUser(normalizedEmail);
      
      // Log user in
      req.login(newUser, (err) => {
        if (err) {
          console.error("Login error after verification:", err);
          return res.status(500).json({ message: "Account created but login failed. Please try logging in." });
        }
        
        // Session regeneration for security
        req.session.regenerate((regErr) => {
          if (regErr) {
            console.error("Session regeneration error:", regErr);
            return res.status(500).json({ message: "Account created but login failed. Please try logging in." });
          }
          
          // Re-login after session regeneration
          req.login(newUser, (loginErr) => {
            if (loginErr) {
              console.error("Re-login error:", loginErr);
              return res.status(500).json({ message: "Account created but login failed. Please try logging in." });
            }
            
            console.log(`User ${normalizedEmail} registered and logged in`);
            res.status(200).json(newUser);
          });
        });
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "An error occurred during verification" });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    const { email, password } = req.body;
    
    // Basic input validation
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }
    
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase();
    
    // Validate it's an ADA email
    if (!normalizedEmail.endsWith('@ada.edu.az')) {
      return res.status(400).json({ message: "Only ADA University email addresses are allowed" });
    }
    
    // Security logging - minimal info
    console.log("Login attempt received from ADA University email");
    
    // Apply rate limiting using email as the key
    const limit = rateLimit(normalizedEmail, loginAttempts, 5, 5 * 60 * 1000); // 5 attempts per 5 minutes
    
    if (limit.limited) {
      return res.status(429).json({ 
        message: `Too many login attempts. Please try again in ${Math.floor(limit.secondsRemaining / 60)} minutes and ${limit.secondsRemaining % 60} seconds.`,
        retryAfter: limit.secondsRemaining
      });
    }
    
    // Authenticate using passport
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        // Count failed attempt
        rateLimit(normalizedEmail, loginAttempts, 5, 5 * 60 * 1000);
        console.log("Authentication failed - invalid credentials");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if this is an admin login attempt
      const { isAdmin } = req.body;
      
      if (isAdmin !== undefined && isAdmin !== user.isAdmin) {
        // Handle wrong account type
        rateLimit(normalizedEmail, loginAttempts, 5, 5 * 60 * 1000);
        console.log("Login attempted with wrong account type");
        return res.status(401).json({ message: "Invalid login credentials" });
      }
      
      // Login successful - establish session
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return next(err);
        }
        
        // Security: Regenerate session ID to prevent session fixation
        req.session.regenerate((regErr) => {
          if (regErr) {
            console.error("Session regeneration error:", regErr);
            return next(regErr);
          }
          
          // Re-login after session regeneration
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("Re-login after session regeneration error:", loginErr);
              return next(loginErr);
            }
            
            // Reset login attempts on successful login
            loginAttempts.delete(normalizedEmail);
            console.log(`✅ User login successful`);
            
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
