import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth.js";
import bcrypt from "bcrypt";
import { 
  insertElectionSchema, 
  insertCandidateSchema, 
  insertElectionCandidateSchema,
  resetPasswordSchema,
  Election
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

// Password hashing function
async function hashPassword(password: string): Promise<string> {
  const SALT_ROUNDS = 10;
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
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
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
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
      
      res.status(200).json({ message: "OTP sent to email for password reset" });
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
        return res.status(400).json({ message: "Invalid OTP" });
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
  const httpServer = createServer(app);

  return httpServer;
}
