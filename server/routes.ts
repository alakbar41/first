import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertElectionSchema, 
  insertCandidateSchema, 
  insertElectionCandidateSchema,
  resetPasswordSchema,
  tokenRequestSchema,
  tokenVerifySchema,
  insertTicketSchema,
  updateTicketStatusSchema,
  Election
} from "@shared/schema";
import { z } from "zod";
import { mailer } from "./mailer.js";

// CSRF token middleware
const csrfTokens = new Map<string, {token: string, expires: number}>();

function generateCSRFToken(req: Request): string {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store with 24 hour expiry
  const expires = Date.now() + (24 * 60 * 60 * 1000);
  
  // Associate with session if available
  const sessionId = req.sessionID || 'anonymous';
  csrfTokens.set(sessionId, { token, expires });
  
  return token;
}

function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  // Skip GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const sessionId = req.sessionID || 'anonymous';
  const storedData = csrfTokens.get(sessionId);
  
  // Check for CSRF token in various locations
  const headerToken = req.headers['x-csrf-token'] as string;
  const bodyToken = req.body?._csrf;
  const xCSRFToken = req.headers['x-csrf-token'] as string; 
  
  // Use any available token (with preference order)
  const userToken = headerToken || xCSRFToken || bodyToken;
  
  console.log('CSRF Validation:', {
    method: req.method,
    path: req.path,
    hasStoredToken: !!storedData,
    tokenExpired: storedData ? Date.now() > storedData.expires : null,
    hasUserToken: !!userToken,
    tokenMatch: storedData && userToken ? storedData.token === userToken : false
  });
  
  // If no stored token or token expired
  if (!storedData || Date.now() > storedData.expires) {
    return res.status(403).json({ message: "CSRF token expired or invalid" });
  }
  
  // If token doesn't match
  if (!userToken || storedData.token !== userToken) {
    return res.status(403).json({ message: "CSRF token validation failed" });
  }
  
  // Clean up expired tokens periodically
  if (Math.random() < 0.01) { // 1% chance to clean on each request
    const now = Date.now();
    for (const [key, data] of csrfTokens.entries()) {
      if (now > data.expires) {
        csrfTokens.delete(key);
      }
    }
  }
  
  next();
}

// Security headers middleware
function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  // Standard security headers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  
  // Strict Transport Security - tell browsers to always use HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Enhanced Content Security Policy
  // More permissive CSP for Polygon blockchain connections
  const cspDirectives = [
    // Default restriction - only allow from same origin
    "default-src 'self'",
    
    // Allow connections to WebSockets, API endpoints, and Polygon RPC
    "connect-src 'self' ws: wss: https://*.polygon.technology https://rpc-amoy.polygon.technology https://*.polygon-amoy.infura.io wss://*.polygon-amoy.infura.io https://polygonscan.com https://amoy.polygonscan.com https://polygon-amoy.infura.io",
    
    // Allow images from our domain, data URLs, and blobs
    "img-src 'self' data: blob: https://polygonscan.com https://amoy.polygonscan.com",
    
    // Allow styles from our domain and inline (needed for shadcn)
    "style-src 'self' 'unsafe-inline'",
    
    // Allow scripts from our domain and inline (needed for React dev)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    
    // Allow fonts from our domain and data URLs
    "font-src 'self' data:",
    
    // Allow frames from same origin only
    "frame-src 'self'",
    
    // Block form submissions to external URLs
    "form-action 'self'",
    
    // Allow object/embed from same origin only
    "object-src 'none'",
    
    // Restrict base URI to our domain
    "base-uri 'self'",
    
    // Restrict manifest files to our domain
    "manifest-src 'self'"
  ];
  
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  
  next();
}

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Middleware to check if user is admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Not authorized. Admin access required." });
  }
  
  next();
}

// Password hashing function
async function hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 10;
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.secure) {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }
  
  // Apply security middleware
  app.use(securityHeaders);
  
  // Set up authentication routes
  setupAuth(app);
  
  // Inactivity timeout middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Skip for non-authenticated users
    if (!req.session.lastActivity || !req.isAuthenticated()) {
      req.session.lastActivity = Date.now();
      return next();
    }
    
    const inactivityLimit = 30 * 60 * 1000; // 30 minutes
    const currentTime = Date.now();
    
    if (currentTime - req.session.lastActivity > inactivityLimit) {
      // Session expired due to inactivity
      return req.session.destroy((err) => {
        if (err) console.error("Session destroy error:", err);
        res.status(401).json({ message: "Session expired due to inactivity" });
      });
    }
    
    // Update last activity
    req.session.lastActivity = currentTime;
    next();
  });
  
  // Get CSRF token
  app.get("/api/csrf-token", (req: Request, res: Response) => {
    const token = generateCSRFToken(req);
    res.json({ csrfToken: token });
  });
  
  // Apply CSRF protection to all routes after this point
  app.use(validateCSRFToken);
  
  // Set up secure file upload
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Configure multer storage with security restrictions
  const multerStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      // Generate a secure random filename with original extension
      const randomName = crypto.randomBytes(16).toString('hex');
      const originalExt = path.extname(file.originalname);
      // Sanitize extension to prevent path traversal
      const safeExt = originalExt.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
      
      // Limit extensions to safe image formats
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
      const finalExt = allowedExts.includes(safeExt) ? safeExt : '.jpg';
      
      cb(null, `${randomName}${finalExt}`);
    }
  });
  
  // File filter to only allow images
  const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false); // Reject file silently
    }
  };
  
  const upload = multer({ 
    storage: multerStorage,
    fileFilter,
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB max file size
      files: 1 // Only allow 1 file at a time
    }
  });
  
  // Election routes
  app.get("/api/elections", async (req, res) => {
    try {
      const elections = await storage.getElections();
      
      // Filter elections based on user role - admins see all, students only see blockchain-deployed elections
      const isAdmin = req.isAuthenticated() && req.user && req.user.isAdmin === true;
      
      if (isAdmin) {
        // Admin sees all elections
        res.json(elections);
      } else {
        // Students see ALL elections that have been deployed to blockchain, regardless of status
        // This gives them time to review candidates before voting begins
        const filteredElections = elections.filter(election => 
          // Only filter on blockchain deployment status, not on election active status
          election.blockchainId !== null && 
          election.blockchainId !== undefined
        );
        console.log(`Student user viewing elections - filtered from ${elections.length} to ${filteredElections.length}`);
        if (filteredElections.length === 0) {
          console.log("No elections available to students. Elections available:", 
            elections.map(e => ({
              id: e.id, 
              name: e.name, 
              blockchainId: e.blockchainId, 
              status: e.status
            }))
          );
        }
        res.json(filteredElections);
      }
    } catch (error) {
      console.error("Failed to fetch elections:", error);
      res.status(500).json({ message: "Failed to fetch elections" });
    }
  });
  
  app.get("/api/elections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const election = await storage.getElection(id);
      
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      // Check if user is admin or if election has a blockchain ID (regardless of status)
      const isAdmin = req.isAuthenticated() && req.user && req.user.isAdmin === true;
      
      if (isAdmin) {
        // Admin sees all elections
        res.json(election);
      } else if (election.blockchainId !== null && 
                 election.blockchainId !== undefined) {
        // Students see ALL elections that are deployed to blockchain, regardless of status
        // This allows them to review candidates before the election starts
        res.json(election);
      } else {
        // Students can't access non-deployed elections
        console.log(`Student tried to access election ${election.id} but was denied. Not deployed to blockchain. BlockchainId: ${election.blockchainId}`);
        return res.status(404).json({ message: "Election not found" });
      }
    } catch (error) {
      console.error("Failed to fetch election:", error);
      res.status(500).json({ message: "Failed to fetch election" });
    }
  });
  
  app.post("/api/elections", isAdmin, async (req, res) => {
    try {
      const result = insertElectionSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid election data", 
          errors: result.error.format() 
        });
      }
      
      const election = await storage.createElection(result.data);
      res.status(201).json(election);
    } catch (error) {
      res.status(500).json({ message: "Failed to create election" });
    }
  });
  
  // Update an election (full update)
  app.patch("/api/elections/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid election ID" });
      }
      
      const election = await storage.getElection(id);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      const updatedElection = await storage.updateElection(id, req.body);
      res.json(updatedElection);
    } catch (error) {
      console.error("Error updating election:", error);
      res.status(500).json({ message: "Failed to update election" });
    }
  });
  
  // Update election blockchain ID (after successful deployment)
  app.patch("/api/elections/:id/blockchain-id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid election ID" });
      }
      
      const { blockchainId } = req.body;
      if (typeof blockchainId !== 'number') {
        return res.status(400).json({ message: "Valid blockchain ID is required" });
      }
      
      const election = await storage.getElection(id);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      console.log(`Updating blockchain ID for election ${id} to ${blockchainId}`);
      
      // Use the simplified updateElection method which handles blockchainId updates specially
      const updatedElection = await storage.updateElection(id, { blockchainId });
      
      // After updating the blockchain ID, immediately check if the election should be active based on dates
      // This will update the status in the database if needed
      await storage.updateElectionStatusBasedOnTime(updatedElection);
      
      // Re-fetch the election to get the possibly updated status
      const finalElection = await storage.getElection(id);
      if (finalElection) {
        console.log(`Election ${id} now has blockchain ID ${finalElection.blockchainId} and status ${finalElection.status}`);
      }
      
      res.json(finalElection || updatedElection);
    } catch (error) {
      console.error("Error updating blockchain ID:", error);
      res.status(500).json({ message: "Failed to update election blockchain ID" });
    }
  });
  
  // Update just the status of an election
  app.patch("/api/elections/:id/status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const election = await storage.getElection(id);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      const statusSchema = z.enum(["upcoming", "active", "completed"]);
      const result = statusSchema.safeParse(status);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid status", 
          errors: result.error.format() 
        });
      }
      
      await storage.updateElectionStatus(id, status);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to update election status" });
    }
  });
  
  // Delete an election
  app.delete("/api/elections/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid election ID" });
      }

      const election = await storage.getElection(id);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }

      await storage.deleteElection(id);
      res.status(200).json({ message: "Election deleted successfully" });
    } catch (error) {
      console.error("Error deleting election:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Candidate routes
  app.get("/api/candidates", async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });
  
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const candidate = await storage.getCandidate(id);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });
  
  app.post("/api/candidates", isAdmin, async (req, res) => {
    try {
      const result = insertCandidateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid candidate data", 
          errors: result.error.format() 
        });
      }
      
      // Check if candidate with studentId already exists
      const existingCandidate = await storage.getCandidateByStudentId(result.data.studentId);
      if (existingCandidate) {
        return res.status(400).json({ message: "Candidate with this student ID already exists" });
      }
      
      const candidate = await storage.createCandidate(result.data);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to create candidate" });
    }
  });
  
  app.patch("/api/candidates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      const updatedCandidate = await storage.updateCandidate(id, req.body);
      res.json(updatedCandidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update candidate" });
    }
  });
  
  // Check if a candidate is in any election (either as main candidate or running mate)
  app.get("/api/candidates/:id/in-elections", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Get all election candidates first to filter properly
      const allElectionCandidates = await storage.getAllElectionCandidates();
      
      // Check if candidate is a main candidate or running mate in any election
      const involvedIn = allElectionCandidates.filter(
        ec => ec.candidateId === id || ec.runningMateId === id
      );
      
      // If not in any election (neither as main nor running mate)
      if (involvedIn.length === 0) {
        return res.json({ inElections: false, elections: [] });
      }
      
      // Get unique election IDs
      const uniqueElectionIds = new Set(
        involvedIn.map(ec => ec.electionId)
      );
      
      // Get full election details and verify they exist
      const electionPromises = Array.from(uniqueElectionIds).map(
        async (electionId) => await storage.getElection(electionId)
      );
      
      const elections = (await Promise.all(electionPromises))
        .filter(e => e !== undefined) as Election[];
      
      // If no valid elections found (all referenced elections were deleted)
      if (elections.length === 0) {
        // Update candidate status since they are not in any valid elections
        if (candidate.status === "active") {
          await storage.updateCandidateStatus(id, "inactive");
        }
        return res.json({ inElections: false, elections: [] });
      }
      
      res.json({ inElections: true, elections });
    } catch (error) {
      console.error("Error checking candidate elections:", error);
      res.status(500).json({ message: "Failed to check candidate elections" });
    }
  });

  app.delete("/api/candidates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Check if candidate is part of any election as a main candidate
      const candidateElections = await storage.getCandidateElections(id);
      if (candidateElections.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete candidate that is part of an election. Remove the candidate from all elections first.",
          inElections: true
        });
      }
      
      // Also check if candidate is used as a running mate in any election
      const allElectionCandidates = await storage.getAllElectionCandidates();
      const isRunningMate = allElectionCandidates.some(ec => ec.runningMateId === id);
      
      if (isRunningMate) {
        return res.status(400).json({ 
          message: "Cannot delete candidate that is used as a vice president in an election. Remove the candidate from all elections first.",
          inElections: true
        });
      }
      
      await storage.deleteCandidate(id);
      
      // Reset candidate IDs sequentially
      await storage.resetCandidateIds();
      
      res.status(200).json({ message: "Candidate deleted successfully" });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });
  
  // Election-Candidate routes
  app.get("/api/elections/:electionId/candidates", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      
      // First, verify the election exists and should be visible to the user
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      // Check if user is admin or if election has a blockchain ID
      const isAdmin = req.isAuthenticated() && req.user && req.user.isAdmin === true;
      
      if (!isAdmin && (election.blockchainId === null || 
                      election.blockchainId === undefined)) {
        // Students can't access candidates for non-deployed elections
        console.log(`Student tried to access candidates for election ${election.id} but was denied. Not deployed to blockchain. BlockchainId: ${election.blockchainId}`);
        return res.status(404).json({ message: "Election not found" });
      }
      
      const electionCandidates = await storage.getElectionCandidates(electionId);
      
      // Get full candidate details for each election candidate
      const candidatesWithDetails = await Promise.all(
        electionCandidates.map(async (ec) => {
          const candidate = await storage.getCandidate(ec.candidateId);
          let runningMate = null;
          
          if (ec.runningMateId && ec.runningMateId > 0) {
            runningMate = await storage.getCandidate(ec.runningMateId);
          }
          
          return {
            ...ec,
            candidate,
            runningMate
          };
        })
      );
      
      res.json(candidatesWithDetails);
    } catch (error) {
      console.error("Failed to fetch election candidates:", error);
      res.status(500).json({ message: "Failed to fetch election candidates" });
    }
  });
  
  // Direct endpoint for election candidates
  app.post("/api/election-candidates", isAdmin, async (req, res) => {
    try {
      const result = insertElectionCandidateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid election candidate data", 
          errors: result.error.format() 
        });
      }
      
      // Verify election exists
      const election = await storage.getElection(result.data.electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      // For president/VP elections, require a running mate
      if ((election.position === "President/VP" || election.position === "President/Vice President") && !result.data.runningMateId) {
        return res.status(400).json({ 
          message: "Running mate is required for President/VP elections" 
        });
      }
      
      // Check if candidate exists
      const candidate = await storage.getCandidate(result.data.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Check if candidate position matches election type
      if ((election.position === "President/VP" || election.position === "President/Vice President") && 
          candidate.position === "Senator") {
        return res.status(400).json({ 
          message: "This candidate is running as a Senator and cannot be added to a President/Vice President election" 
        });
      }
      
      if (election.position === "Senator" && 
          (candidate.position === "President" || candidate.position === "Vice President")) {
        return res.status(400).json({ 
          message: "This candidate is running as " + candidate.position + " and cannot be added to a Senator election" 
        });
      }
      
      // Check if running mate exists
      if (result.data.runningMateId) {
        const runningMate = await storage.getCandidate(result.data.runningMateId);
        if (!runningMate) {
          return res.status(404).json({ message: "Running mate not found" });
        }
        
        // Check if running mate position matches election type
        if ((election.position === "President/VP" || election.position === "President/Vice President") && 
            runningMate.position === "Senator") {
          return res.status(400).json({ 
            message: "The running mate is registered as a Senator and cannot be added to a President/Vice President election" 
          });
        }
      }
      
      // Check if candidate already in this election
      const existingCandidates = await storage.getElectionCandidates(result.data.electionId);
      const alreadyAdded = existingCandidates.some(
        ec => ec.candidateId === result.data.candidateId
      );
      
      if (alreadyAdded) {
        return res.status(400).json({ message: "Candidate already added to this election" });
      }
      
      // Check if running mate already in this election
      if (result.data.runningMateId) {
        const runningMateAlreadyAdded = existingCandidates.some(
          ec => ec.candidateId === result.data.runningMateId || ec.runningMateId === result.data.runningMateId
        );
        
        if (runningMateAlreadyAdded) {
          return res.status(400).json({ message: "Running mate already added to this election" });
        }
      }
      
      const electionCandidate = await storage.addCandidateToElection(result.data);
      res.status(201).json(electionCandidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to add candidate to election" });
    }
  });
  
  app.post("/api/elections/:electionId/candidates", isAdmin, async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      
      // Verify election exists
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      const data = {
        ...req.body,
        electionId
      };
      
      const result = insertElectionCandidateSchema.safeParse(data);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid election candidate data", 
          errors: result.error.format() 
        });
      }
      
      // For president/VP elections, require a running mate
      if ((election.position === "President/VP" || election.position === "President/Vice President") && !result.data.runningMateId) {
        return res.status(400).json({ 
          message: "Running mate is required for President/VP elections" 
        });
      }
      
      // Check if candidate exists
      const candidate = await storage.getCandidate(result.data.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      // Check if candidate position matches election type
      if ((election.position === "President/VP" || election.position === "President/Vice President") && 
          candidate.position === "Senator") {
        return res.status(400).json({ 
          message: "This candidate is running as a Senator and cannot be added to a President/Vice President election" 
        });
      }
      
      if (election.position === "Senator" && 
          (candidate.position === "President" || candidate.position === "Vice President")) {
        return res.status(400).json({ 
          message: "This candidate is running as " + candidate.position + " and cannot be added to a Senator election" 
        });
      }
      
      // Check if running mate exists
      if (result.data.runningMateId) {
        const runningMate = await storage.getCandidate(result.data.runningMateId);
        if (!runningMate) {
          return res.status(404).json({ message: "Running mate not found" });
        }
        
        // Check if running mate position matches election type
        if ((election.position === "President/VP" || election.position === "President/Vice President") && 
            runningMate.position === "Senator") {
          return res.status(400).json({ 
            message: "The running mate is registered as a Senator and cannot be added to a President/Vice President election" 
          });
        }
      }
      
      // Check if candidate already in this election
      const existingCandidates = await storage.getElectionCandidates(electionId);
      const alreadyAdded = existingCandidates.some(
        ec => ec.candidateId === result.data.candidateId
      );
      
      if (alreadyAdded) {
        return res.status(400).json({ message: "Candidate already added to this election" });
      }
      
      // Check if running mate already in this election
      if (result.data.runningMateId) {
        const runningMateAlreadyAdded = existingCandidates.some(
          ec => ec.candidateId === result.data.runningMateId || ec.runningMateId === result.data.runningMateId
        );
        
        if (runningMateAlreadyAdded) {
          return res.status(400).json({ message: "Running mate already added to this election" });
        }
      }
      
      const electionCandidate = await storage.addCandidateToElection(result.data);
      res.status(201).json(electionCandidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to add candidate to election" });
    }
  });
  
  app.delete("/api/elections/:electionId/candidates/:candidateId", isAdmin, async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const candidateId = parseInt(req.params.candidateId);
      
      // Verify election exists
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      await storage.removeCandidateFromElection(electionId, candidateId);
      res.status(200).json({ message: "Candidate removed from election successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove candidate from election" });
    }
  });
  
  // Get all election-candidate relationships (for admin blockchain sync)
  app.get("/api/election-candidates", isAdmin, async (req, res) => {
    try {
      const electionCandidates = await storage.getAllElectionCandidates();
      res.json(electionCandidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all election candidates" });
    }
  });
  
  // Password Reset Routes
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if a real user exists with this email
      const user = await storage.getUserByEmail(email);
      
      // Only proceed with the actual reset if the user exists
      if (user) {
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if pending user exists
        const pendingUser = await storage.getPendingUserByEmail(email);
        if (pendingUser) {
          // Update existing pending user with new OTP
          await storage.updatePendingUserOtp(email, otp);
        } else {
          // Create a new pending user for password reset with minimum required fields
          await storage.createPendingUser({
            email,
            otp,
            type: "reset",
            password: "temporary", // This will be replaced when reset is complete
            faculty: "none", // Not relevant for password reset
            createdAt: new Date()
          });
        }
        
        // Send OTP to email
        await mailer.sendOtp(email, otp);
      }
      
      // Always return the same success message, whether the user exists or not
      // This prevents user enumeration attacks
      res.status(200).json({ message: "If the email exists in our system, a verification code has been sent. Please check your inbox." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to initiate password reset" });
    }
  });
  
  app.post("/api/reset-password/verify", async (req, res) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid reset password data", 
          errors: result.error.format() 
        });
      }
      
      const { email, otp, newPassword } = result.data;
      
      // Verify OTP
      const pendingUser = await storage.getPendingUserByEmail(email);
      
      if (!pendingUser || pendingUser.otp !== otp) {
        // Security best practice: Use a generic error message to prevent user enumeration
        // This message does not reveal if the email exists or if just the OTP is wrong
        return res.status(400).json({ 
          message: "Verification failed. Please ensure your email and verification code are correct."
        });
      }
      
      // Verify user actually exists before updating password
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // This should rarely happen (only if user was deleted between reset request and verification)
        // Still using generic message to avoid leaking information
        return res.status(400).json({ 
          message: "Verification failed. Please ensure your email and verification code are correct."
        });
      }
      
      // Hash the new password 
      const hashedPassword = await hashPassword(newPassword);
      console.log(`Reset password: Generated hash for password (length ${hashedPassword.length})`);
      
      // Update password with the hashed version
      await storage.updateUserPassword(email, hashedPassword);
      
      // Remove pending user
      await storage.deletePendingUser(email);
      
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password reset verify error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Endpoint to manually update candidate status (for debugging/fixing status issues)
  app.post("/api/candidates/:id/update-status", isAdmin, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      
      // Get the candidate to check if it exists
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ message: `Candidate with ID ${candidateId} not found` });
      }
      
      // Update the candidate's status based on their election participation
      await storage.updateCandidateActiveStatus(candidateId);
      
      // Get the updated candidate
      const updatedCandidate = await storage.getCandidate(candidateId);
      
      res.json({
        message: `Candidate status updated successfully`,
        candidate: updatedCandidate
      });
    } catch (error) {
      res.status(500).json({ message: `Error updating candidate status: ${error.message}` });
    }
  });
  
  // Create HTTP server
  // Secure file upload endpoint
  app.post("/api/upload", isAdmin, upload.single('image'), (req: Request & { file?: Express.Multer.File }, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Generate a URL for the file - remove leading slash from the path for URL formatting
      const fileUrl = `/uploads/${req.file.filename}`;
      
      // Return the URL for the client to use
      res.status(200).json({ 
        url: fileUrl,
        message: "File uploaded successfully" 
      });
    } catch (error) {
      console.error("File upload error:", error);
      
      // Generic error response to prevent information disclosure
      res.status(500).json({ message: "An error occurred during file upload" });
    }
  });
  
  // Serve static files from uploads directory with proper Content-Type headers
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    // Check if file exists and is an image before serving
    const requestedFile = path.join(uploadsDir, path.basename(req.path));
    
    // Prevent path traversal by normalizing and checking the path
    const normalizedPath = path.normalize(requestedFile);
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Ensure only image files are served
    if (!req.path.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Check if file exists
    fs.access(normalizedPath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: "File not found" });
      }
      next();
    });
  }, express.static(uploadsDir));
  
  // Voting token endpoints for secure blockchain voting
  
  // Request a one-time voting token for a specific election
  app.post("/api/voting-tokens", isAuthenticated, async (req, res) => {
    try {
      const result = tokenRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { electionId } = result.data;
      
      // Check if the election exists and is active
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
      
      if (election.status !== "active") {
        return res.status(400).json({ 
          message: "Voting tokens can only be generated for active elections", 
          status: election.status 
        });
      }
      
      // Check if user has already voted in this election
      if (await storage.hasUserVoted(req.user.id, electionId)) {
        return res.status(400).json({ message: "You have already voted in this election" });
      }
      
      // Create a new voting token
      const token = await storage.createVotingToken(req.user.id, electionId);
      
      // Return only the token string, not the full object (for security)
      res.status(201).json({ token: token.token });
    } catch (error) {
      console.error("Error generating voting token:", error);
      res.status(500).json({ message: "Failed to generate voting token" });
    }
  });
  
  // Verify a token (used by the client before submitting to blockchain)
  app.post("/api/voting-tokens/verify", isAuthenticated, async (req, res) => {
    try {
      const result = tokenVerifySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { token, electionId } = result.data;
      
      // Validate the token
      const isValid = await storage.validateVotingToken(token, electionId);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Error verifying voting token:", error);
      res.status(500).json({ message: "Failed to verify voting token" });
    }
  });
  
  // Mark a token as used after successful blockchain vote
  app.post("/api/voting-tokens/use", isAuthenticated, async (req, res) => {
    try {
      const result = tokenVerifySchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { token, electionId } = result.data;
      
      // Validate the token first
      const isValid = await storage.validateVotingToken(token, electionId);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Require a transaction hash to mark the token as used - this proves the blockchain transaction was submitted
      const txHash = req.body.txHash;
      if (!txHash) {
        return res.status(400).json({ message: "Transaction hash required" });
      }
      
      // Mark the token as used
      await storage.markTokenAsUsed(token);
      
      // Record the vote in our database (for backup tracking)
      await storage.recordVote(req.user.id, electionId);
      
      res.status(200).json({ message: "Vote recorded successfully" });
    } catch (error) {
      console.error("Error recording vote:", error);
      res.status(500).json({ message: "Failed to record vote" });
    }
  });
  
  // Reset a vote if blockchain transaction failed
  app.post("/api/votes/reset", isAuthenticated, async (req, res) => {
    try {
      const schema = z.object({
        electionId: z.number(),
        txHash: z.string().optional() // The transaction hash that failed (for logging)
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.format() 
        });
      }
      
      const { electionId, txHash } = result.data;
      
      // First check if the user has voted in this election
      const hasVoted = await storage.hasUserVoted(req.user.id, electionId);
      
      if (!hasVoted) {
        return res.status(400).json({ message: "No vote found to reset" });
      }
      
      // Reset the vote
      await storage.resetVote(req.user.id, electionId);
      
      console.log(`Vote reset for user ${req.user.id} in election ${electionId}. Failed transaction: ${txHash || 'unknown'}`);
      
      res.status(200).json({ message: "Vote reset successfully" });
    } catch (error) {
      console.error("Error resetting vote:", error);
      res.status(500).json({ message: "Failed to reset vote" });
    }
  });
  
  // Check if a user has already voted in an election
  app.get("/api/elections/:electionId/has-voted", isAuthenticated, async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      
      if (isNaN(electionId)) {
        return res.status(400).json({ message: "Invalid election ID" });
      }
      
      const hasVoted = await storage.hasUserVoted(req.user.id, electionId);
      
      res.status(200).json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });
  
  // New endpoint with simpler route for checking user-voted status
  app.get("/api/elections/:electionId/user-voted", isAuthenticated, async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      
      if (isNaN(electionId)) {
        return res.status(400).json({ message: "Invalid election ID" });
      }
      
      const hasVoted = await storage.hasUserVoted(req.user.id, electionId);
      
      res.status(200).json({ hasVoted });
    } catch (error) {
      console.error("Error checking vote status:", error);
      res.status(500).json({ message: "Failed to check vote status" });
    }
  });
  
  // Ticket system routes
  
  // Get all tickets (admin only)
  app.get("/api/tickets", isAdmin, async (req, res) => {
    try {
      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });
  
  // Get tickets for current user
  app.get("/api/my-tickets", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getUserTickets(req.user.id);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({ message: "Failed to fetch your tickets" });
    }
  });
  
  // Get a specific ticket
  app.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const ticket = await storage.getTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Check if user is admin or ticket owner
      if (!req.user.isAdmin && ticket.userId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view this ticket" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });
  
  // Create a new ticket
  app.post("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const result = insertTicketSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid ticket data", 
          errors: result.error.format() 
        });
      }
      
      const userId = req.user.id;
      const ticket = await storage.createTicket(userId, result.data);
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });
  
  // Update ticket status (admin only)
  app.patch("/api/tickets/:id/status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }
      
      const result = updateTicketStatusSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid status", 
          errors: result.error.format() 
        });
      }
      
      const ticket = await storage.updateTicketStatus(id, result.data.status);
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });
  
  // Reset user's vote for an election (now allowed for students for testing purposes)
  app.post("/api/test/reset-user-vote", isAuthenticated, async (req, res) => {
    try {
      const { electionId } = req.body;
      
      if (!electionId || typeof electionId !== 'number') {
        return res.status(400).json({ message: "Invalid election ID" });
      }
      
      // Check if the user has voted in this election
      const hasVoted = await storage.hasUserVoted(req.user.id, electionId);
      
      if (!hasVoted) {
        return res.status(400).json({ message: "No vote found to reset" });
      }
      
      // Reset the vote
      await storage.resetVote(req.user.id, electionId);
      
      console.log(`Vote reset for user ${req.user.id} in election ${electionId} for testing purposes`);
      
      res.json({ message: "Vote reset successfully" });
    } catch (error) {
      console.error("Error resetting vote:", error);
      res.status(500).json({ message: "Failed to reset vote" });
    }
  });
  
  const httpServer = createServer(app);

  return httpServer;
}
