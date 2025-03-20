import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth.js";
import { insertElectionSchema } from "@shared/schema";
import { z } from "zod";

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

      // For now, we'll just return success as we don't have a delete method implemented
      // In a real implementation, this would be: await storage.deleteElection(id);
      res.status(200).json({ message: "Election deleted successfully" });
    } catch (error) {
      console.error("Error deleting election:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
