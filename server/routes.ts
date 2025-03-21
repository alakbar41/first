import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth.js";
import { 
  insertElectionSchema, 
  insertCandidateSchema, 
  insertElectionCandidateSchema,
  resetPasswordSchema 
} from "@shared/schema";
import { z } from "zod";
import { mailer } from "./mailer.js";

// Middleware to check if user is admin
function isAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Not authorized. Admin access required." });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Election routes
  app.get("/api/elections", async (req, res) => {
    try {
      const elections = await storage.getElections();
      res.json(elections);
    } catch (error) {
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
      
      res.json(election);
    } catch (error) {
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
  
  app.delete("/api/candidates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      
      await storage.deleteCandidate(id);
      res.status(200).json({ message: "Candidate deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });
  
  // Election-Candidate routes
  app.get("/api/elections/:electionId/candidates", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
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
      res.status(500).json({ message: "Failed to fetch election candidates" });
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
      if (election.position === "President/Vice President" && !result.data.runningMateId) {
        return res.status(400).json({ 
          message: "Running mate is required for President/Vice President elections" 
        });
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
          ec => ec.candidateId === result.data.runningMateId
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
  
  // Password Reset Routes
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await storage.updatePendingUserOtp(email, otp);
      
      // Send OTP to email
      await mailer.sendOtp(email, otp);
      
      res.status(200).json({ message: "OTP sent to email for password reset" });
    } catch (error) {
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
        return res.status(400).json({ message: "Invalid OTP" });
      }
      
      // Update password
      await storage.updateUserPassword(email, newPassword);
      
      // Remove pending user
      await storage.deletePendingUser(email);
      
      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
