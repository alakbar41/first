import { users, pendingUsers, elections, candidates, electionCandidates, 
  type User, type InsertUser, 
  type PendingUser, type InsertPendingUser, 
  type Election, type InsertElection,
  type Candidate, type InsertCandidate,
  type ElectionCandidate, type InsertElectionCandidate
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(email: string, newPassword: string): Promise<void>;
  
  // Pending user methods
  getPendingUserByEmail(email: string): Promise<PendingUser | undefined>;
  getPendingUserByResetToken(token: string): Promise<PendingUser | undefined>;
  createPendingUser(user: InsertPendingUser): Promise<PendingUser>;
  updatePendingUserOtp(email: string, otp: string): Promise<void>;
  updatePendingUserResetToken(email: string, token: string, tokenExpiry: Date): Promise<void>;
  deletePendingUser(email: string): Promise<void>;
  
  // Election methods
  getElections(): Promise<Election[]>;
  getElection(id: number): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  updateElection(id: number, election: Partial<InsertElection>): Promise<Election>;
  updateElectionStatus(id: number, status: string): Promise<void>;
  updateElectionStatusBasedOnTime(election: Election): Promise<void>;
  deleteElection(id: number): Promise<void>;
  
  // Candidate methods
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidateByStudentId(studentId: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  updateCandidateStatus(id: number, status: string): Promise<void>;
  updateCandidateStatusesForElection(electionId: number): Promise<void>;
  updateCandidateActiveStatus(candidateId: number): Promise<void>;
  deleteCandidate(id: number): Promise<void>;
  resetCandidateIds(): Promise<void>;
  
  // Election-Candidate methods
  getElectionCandidates(electionId: number): Promise<ElectionCandidate[]>;
  getCandidateElections(candidateId: number): Promise<ElectionCandidate[]>;
  getAllElectionCandidates(): Promise<ElectionCandidate[]>;
  addCandidateToElection(electionCandidate: InsertElectionCandidate): Promise<ElectionCandidate>;
  removeCandidateFromElection(electionId: number, candidateId: number): Promise<void>;
  
  // Vote history tracking (optional, blockchain is the main source of truth)
  recordVote?(userId: number, electionId: number): Promise<void>;
  hasUserVoted?(userId: number, electionId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pendingUsers: Map<string, PendingUser>;
  private elections: Map<number, Election>;
  private candidates: Map<number, Candidate>;
  private electionCandidates: Map<number, ElectionCandidate>;
  
  sessionStore: session.Store;
  currentId: number;
  currentElectionId: number;
  currentCandidateId: number;
  currentElectionCandidateId: number;

  constructor() {
    this.users = new Map();
    this.pendingUsers = new Map();
    this.elections = new Map();
    this.candidates = new Map();
    this.electionCandidates = new Map();
    
    this.currentId = 1;
    this.currentElectionId = 1;
    this.currentCandidateId = 1;
    this.currentElectionCandidateId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Pre-populate admin user
    this.createUser({
      email: 'admin@ada.edu.az',
      password: '$2b$10$pxB6DROWxUGrMa5nrgr9JOcP62WMJ0gQyWYm7VIxyOgaRADqg1BmS', // 'Admin123@'
      faculty: 'ADMIN',
      isAdmin: true
    });
    
    // Add permanent student account
    this.createUser({
      email: 'balakbarli14184@ada.edu.az',
      password: '$2b$10$8gvO.0jc/UF0I7NHDJwGyO/Frs76qPNlwXNsCeJHsjv.h2.IlCMSK', // 'Salam123@'
      faculty: 'SITE',
      isAdmin: false
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      id, 
      email: insertUser.email,
      password: insertUser.password,
      faculty: insertUser.faculty,
      isAdmin: insertUser.isAdmin ?? false
    };
    this.users.set(id, user);
    return user;
  }

  async getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
    return this.pendingUsers.get(email);
  }
  
  async getPendingUserByResetToken(token: string): Promise<PendingUser | undefined> {
    return Array.from(this.pendingUsers.values()).find(
      (user) => user.resetToken === token && user.type === 'reset'
    );
  }

  async createPendingUser(user: InsertPendingUser): Promise<PendingUser> {
    const pendingUser: PendingUser = {
      email: user.email,
      password: user.password,
      faculty: user.faculty,
      otp: user.otp,
      resetToken: user.resetToken,
      tokenExpiry: user.tokenExpiry,
      type: user.type || 'registration',
      createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
      isAdmin: user.isAdmin ?? false
    };
    this.pendingUsers.set(user.email, pendingUser);
    return pendingUser;
  }

  async updatePendingUserOtp(email: string, otp: string): Promise<void> {
    const pendingUser = this.pendingUsers.get(email);
    if (pendingUser) {
      pendingUser.otp = otp;
      pendingUser.createdAt = new Date();
      this.pendingUsers.set(email, pendingUser);
    }
  }
  
  async updatePendingUserResetToken(email: string, token: string, tokenExpiry: Date): Promise<void> {
    const pendingUser = this.pendingUsers.get(email);
    if (pendingUser) {
      pendingUser.resetToken = token;
      pendingUser.tokenExpiry = tokenExpiry;
      pendingUser.createdAt = new Date();
      this.pendingUsers.set(email, pendingUser);
    }
  }

  async deletePendingUser(email: string): Promise<void> {
    this.pendingUsers.delete(email);
  }

  // Election methods
  async getElections(): Promise<Election[]> {
    return Array.from(this.elections.values());
  }

  async getElection(id: number): Promise<Election | undefined> {
    return this.elections.get(id);
  }

  async createElection(election: InsertElection): Promise<Election> {
    const id = this.currentElectionId++;
    const newElection: Election = {
      id,
      name: election.name,
      position: election.position,
      description: election.description,
      startDate: election.startDate instanceof Date ? election.startDate : new Date(election.startDate),
      endDate: election.endDate instanceof Date ? election.endDate : new Date(election.endDate),
      eligibleFaculties: election.eligibleFaculties,
      status: election.status || "upcoming",
      createdBy: election.createdBy,
      createdAt: new Date(),
      blockchainId: null,
    };
    
    this.elections.set(id, newElection);
    return newElection;
  }

  async updateElectionStatus(id: number, status: string): Promise<void> {
    const election = this.elections.get(id);
    if (election) {
      election.status = status;
      this.elections.set(id, election);
      
      // If the election is marked as completed, update candidate statuses
      if (status === 'completed') {
        await this.updateCandidateStatusesForElection(id);
      }
    }
  }
  
  // Implementation of status check/update based on current date
  async updateElectionStatusBasedOnTime(election: Election): Promise<void> {
    // Only update blockchain-deployed elections
    if (election.blockchainId === null || election.blockchainId === undefined) {
      return;
    }
    
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    
    let newStatus = election.status;
    let statusChanged = false;
    
    // Check if election should be active
    if (now >= startDate && now < endDate && election.status === 'upcoming') {
      newStatus = 'active';
      statusChanged = true;
      console.log(`Automatically updating election ${election.id} to active status`);
    } 
    // Check if election should be completed
    else if (now >= endDate && election.status !== 'completed') {
      newStatus = 'completed';
      statusChanged = true;
      console.log(`Automatically updating election ${election.id} to completed status`);
    }
    
    // Update if status changed
    if (statusChanged) {
      await this.updateElectionStatus(election.id, newStatus);
      election.status = newStatus; // Update the passed object as well
      
      // Update candidate statuses when election status changes
      // Get all candidates in this election
      const electionCandidatesList = await this.getElectionCandidates(election.id);
      for (const ec of electionCandidatesList) {
        await this.updateCandidateActiveStatus(ec.candidateId);
        
        if (ec.runningMateId && ec.runningMateId > 0) {
          await this.updateCandidateActiveStatus(ec.runningMateId);
        }
      }
    }
  }
  
  async deleteElection(id: number): Promise<void> {
    // First, identify all affected candidates in this election
    const electionCandidates = await this.getElectionCandidates(id);
    
    // Track candidates and running mates affected by this deletion
    const affectedCandidateIds: number[] = [];
    for (const ec of electionCandidates) {
      if (!affectedCandidateIds.includes(ec.candidateId)) {
        affectedCandidateIds.push(ec.candidateId);
      }
      
      if (ec.runningMateId && !affectedCandidateIds.includes(ec.runningMateId)) {
        affectedCandidateIds.push(ec.runningMateId);
      }
    }
    
    console.log(`Deleting election ${id}, affecting candidates:`, affectedCandidateIds);
    
    // Delete each election-candidate relationship
    for (const ec of electionCandidates) {
      this.electionCandidates.delete(ec.id);
    }
    
    // Then delete the election itself
    this.elections.delete(id);
    
    // Now update each affected candidate's status
    for (const candidateId of affectedCandidateIds) {
      await this.updateCandidateActiveStatus(candidateId);
    }
  }
  
  async updateElection(id: number, election: Partial<InsertElection>): Promise<Election> {
    const existingElection = this.elections.get(id);
    
    if (!existingElection) {
      throw new Error(`Election with id ${id} not found`);
    }
    
    const updatedElection: Election = {
      ...existingElection,
      ...election,
      startDate: election.startDate ? 
        (election.startDate instanceof Date ? election.startDate : new Date(election.startDate)) 
        : existingElection.startDate,
      endDate: election.endDate ? 
        (election.endDate instanceof Date ? election.endDate : new Date(election.endDate)) 
        : existingElection.endDate,
      eligibleFaculties: election.eligibleFaculties || existingElection.eligibleFaculties,
    };
    
    this.elections.set(id, updatedElection);
    return updatedElection;
  }
  
  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user) {
      // The newPassword is already hashed by the time it gets here
      // We should NOT hash it again, just store it as is
      user.password = newPassword;
      this.users.set(user.id, user);
    } else {
      throw new Error(`User with email ${email} not found`);
    }
  }
  
  // Candidate methods
  async getCandidates(): Promise<Candidate[]> {
    return Array.from(this.candidates.values());
  }
  
  async getCandidate(id: number): Promise<Candidate | undefined> {
    return this.candidates.get(id);
  }
  
  async getCandidateByStudentId(studentId: string): Promise<Candidate | undefined> {
    return Array.from(this.candidates.values()).find(
      (candidate) => candidate.studentId === studentId
    );
  }
  
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const id = this.currentCandidateId++;
    const now = new Date();
    
    const newCandidate: Candidate = {
      id,
      fullName: candidate.fullName,
      studentId: candidate.studentId,
      faculty: candidate.faculty,
      position: candidate.position,
      status: "inactive", // Default status is inactive until added to an election
      pictureUrl: candidate.pictureUrl || "",
      createdAt: now,
      updatedAt: now
    };
    
    this.candidates.set(id, newCandidate);
    return newCandidate;
  }
  
  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const existingCandidate = this.candidates.get(id);
    
    if (!existingCandidate) {
      throw new Error(`Candidate with id ${id} not found`);
    }
    
    // Ensure optional fields have default values
    if (candidate.pictureUrl === undefined) {
      candidate.pictureUrl = existingCandidate.pictureUrl;
    }
    
    const updatedCandidate: Candidate = {
      ...existingCandidate,
      ...candidate,
      pictureUrl: candidate.pictureUrl || "",
      status: existingCandidate.status, // Preserve status - it's managed by election associations
      updatedAt: new Date()
    };
    
    this.candidates.set(id, updatedCandidate);
    return updatedCandidate;
  }
  
  async updateCandidateStatus(id: number, status: string): Promise<void> {
    const candidate = this.candidates.get(id);
    if (candidate) {
      candidate.status = status;
      candidate.updatedAt = new Date();
      this.candidates.set(id, candidate);
    } else {
      throw new Error(`Candidate with id ${id} not found`);
    }
  }
  
  // Helper method to update candidate statuses when an election completes
  async updateCandidateStatusesForElection(electionId: number): Promise<void> {
    // Get all candidates in this election
    const electionCandidates = await this.getElectionCandidates(electionId);
    
    // For each candidate, check if they're in any active elections
    for (const ec of electionCandidates) {
      await this.updateCandidateActiveStatus(ec.candidateId);
      
      // Also update running mate if exists
      if (ec.runningMateId && ec.runningMateId > 0) {
        await this.updateCandidateActiveStatus(ec.runningMateId);
      }
    }
  }
  
  // Helper method to determine and update a candidate's status based on elections
  async updateCandidateActiveStatus(candidateId: number): Promise<void> {
    // Get the candidate
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) return;
    
    // Get all elections where the candidate is the main candidate
    const candidateElections = await this.getCandidateElections(candidateId);
    
    // Get all elections where the candidate is a running mate
    const runningMateElections = Array.from(this.electionCandidates.values())
      .filter(ec => ec.runningMateId === candidateId);
    
    // If not in any elections at all, mark as inactive immediately
    if (candidateElections.length === 0 && runningMateElections.length === 0) {
      if (candidate.status !== 'inactive') {
        await this.updateCandidateStatus(candidateId, 'inactive');
        console.log(`Candidate ${candidateId} marked inactive - not in any elections`);
      }
      return;
    }
    
    // Get all elections the candidate is part of
    const allElectionEntries = [...candidateElections, ...runningMateElections];
    
    // Gather all the election objects
    const validElections: Election[] = [];
    for (const ec of allElectionEntries) {
      const election = await this.getElection(ec.electionId);
      if (election) {
        validElections.push(election);
      }
    }
    
    // If there are no valid elections, mark as inactive
    if (validElections.length === 0) {
      if (candidate.status !== 'inactive') {
        await this.updateCandidateStatus(candidateId, 'inactive');
        console.log(`Candidate ${candidateId} marked inactive - no valid elections`);
      }
      return;
    }
    
    // Check if the candidate is in any active or upcoming election
    const inActiveElection = validElections.some(e => e.status === 'active');
    const inUpcomingElection = validElections.some(e => e.status === 'upcoming');
    
    // Determine the appropriate status
    let newStatus = 'inactive';
    if (inActiveElection) {
      newStatus = 'active';
    } else if (inUpcomingElection) {
      newStatus = 'pending';
    }
    
    // Update status if needed
    if (candidate.status !== newStatus) {
      await this.updateCandidateStatus(candidateId, newStatus);
      console.log(`Candidate ${candidateId} marked ${newStatus} - based on election status check`);
    } else {
      console.log(`Candidate ${candidateId} status remains ${candidate.status}`);
    }
  }
  
  async deleteCandidate(id: number): Promise<void> {
    this.candidates.delete(id);
    
    // After deletion, if no candidates are left, reset the ID counter
    if (this.candidates.size === 0) {
      this.currentCandidateId = 1;
    } else {
      // Set the next ID to be the maximum existing ID + 1
      const maxId = Math.max(...Array.from(this.candidates.keys()));
      this.currentCandidateId = maxId + 1;
    }
  }
  
  // Election-Candidate methods
  async getElectionCandidates(electionId: number): Promise<ElectionCandidate[]> {
    return Array.from(this.electionCandidates.values()).filter(
      (ec) => ec.electionId === electionId
    );
  }
  
  async getCandidateElections(candidateId: number): Promise<ElectionCandidate[]> {
    return Array.from(this.electionCandidates.values()).filter(
      (ec) => ec.candidateId === candidateId
    );
  }
  
  async addCandidateToElection(electionCandidate: InsertElectionCandidate): Promise<ElectionCandidate> {
    const id = this.currentElectionCandidateId++;
    
    const newElectionCandidate: ElectionCandidate = {
      id,
      electionId: electionCandidate.electionId,
      candidateId: electionCandidate.candidateId,
      runningMateId: electionCandidate.runningMateId || 0,
      createdAt: new Date()
    };
    
    this.electionCandidates.set(id, newElectionCandidate);
    
    // Update candidate status based on the election's status
    await this.updateCandidateActiveStatus(electionCandidate.candidateId);
    
    // If there's a running mate, update their status too
    if (electionCandidate.runningMateId && electionCandidate.runningMateId > 0) {
      await this.updateCandidateActiveStatus(electionCandidate.runningMateId);
    }
    
    return newElectionCandidate;
  }
  
  async getAllElectionCandidates(): Promise<ElectionCandidate[]> {
    return Array.from(this.electionCandidates.values());
  }
  
  async resetCandidateIds(): Promise<void> {
    // Get all candidates sorted by ID
    const sortedCandidates = Array.from(this.candidates.values())
      .sort((a, b) => a.id - b.id);
    
    // Create a new map for the reorganized candidates
    const newCandidatesMap = new Map<number, Candidate>();
    
    // Reassign IDs sequentially
    let newId = 1;
    for (const candidate of sortedCandidates) {
      const updatedCandidate = { ...candidate, id: newId };
      newCandidatesMap.set(newId, updatedCandidate);
      
      // Update the candidate's ID in all election-candidate relationships
      const relatedElectionCandidates = Array.from(this.electionCandidates.values())
        .filter(ec => ec.candidateId === candidate.id || ec.runningMateId === candidate.id);
      
      for (const ec of relatedElectionCandidates) {
        if (ec.candidateId === candidate.id) {
          ec.candidateId = newId;
        }
        if (ec.runningMateId === candidate.id) {
          ec.runningMateId = newId;
        }
        
        this.electionCandidates.set(ec.id, ec);
      }
      
      newId++;
    }
    
    // Replace the old map with the new one
    this.candidates = newCandidatesMap;
    
    // Update current ID counter
    this.currentCandidateId = newId;
  }

  async removeCandidateFromElection(electionId: number, candidateId: number): Promise<void> {
    // Find the election-candidate entry
    const entry = Array.from(this.electionCandidates.values()).find(
      (ec) => ec.electionId === electionId && ec.candidateId === candidateId
    );
    
    if (entry) {
      const runningMateId = entry.runningMateId;
      
      // Delete the relationship
      this.electionCandidates.delete(entry.id);
      
      // Update the candidate's status based on remaining elections
      await this.updateCandidateActiveStatus(candidateId);
      
      // Also update the running mate's status if there was one
      if (runningMateId && runningMateId > 0) {
        await this.updateCandidateActiveStatus(runningMateId);
      }
    }
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Initialize default users if they don't exist
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers() {
    try {
      // Check if admin user exists
      const adminUser = await this.getUserByEmail('admin@ada.edu.az');
      if (!adminUser) {
        console.log("Creating default admin user");
        await this.createUser({
          email: 'admin@ada.edu.az',
          password: '$2b$10$pxB6DROWxUGrMa5nrgr9JOcP62WMJ0gQyWYm7VIxyOgaRADqg1BmS', // 'Admin123@'
          faculty: 'ADMIN',
          isAdmin: true
        });
      }
      
      // Check if student user exists
      const studentUser = await this.getUserByEmail('balakbarli14184@ada.edu.az');
      if (!studentUser) {
        console.log("Creating default student user");
        await this.createUser({
          email: 'balakbarli14184@ada.edu.az',
          password: '$2b$10$8gvO.0jc/UF0I7NHDJwGyO/Frs76qPNlwXNsCeJHsjv.h2.IlCMSK', // 'Salam123@'
          faculty: 'SITE',
          isAdmin: false
        });
      }
    } catch (err) {
      console.error("Error initializing default users:", err);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUserPassword(email: string, newPassword: string): Promise<void> {
    // First check if the user exists to provide a better error message
    const user = await this.getUserByEmail(email);
    if (!user) {
      // In production, you might want to log this but not throw an error for security reasons
      // However, for debugging purposes, we'll throw an error but without user enumeration
      throw new Error("Password update failed - account verification error");
    }
    
    await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.email, email));
  }

  // Pending user methods
  async getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
    const result = await db.select().from(pendingUsers).where(eq(pendingUsers.email, email));
    return result[0];
  }
  
  async getPendingUserByResetToken(token: string): Promise<PendingUser | undefined> {
    const result = await db.select().from(pendingUsers)
      .where(and(
        eq(pendingUsers.resetToken, token),
        eq(pendingUsers.type, 'reset')
      ));
    return result[0];
  }

  async createPendingUser(user: InsertPendingUser): Promise<PendingUser> {
    // If a pending user with this email already exists, delete it first
    const existingUser = await this.getPendingUserByEmail(user.email);
    if (existingUser) {
      await this.deletePendingUser(user.email);
    }
    
    // Ensure that resetToken and tokenExpiry are properly handled
    const pendingUserData = {
      ...user,
      // Use null instead of undefined for proper database storage
      resetToken: user.resetToken || null,
      tokenExpiry: user.tokenExpiry || null
    };
    
    const result = await db.insert(pendingUsers).values(pendingUserData).returning();
    return result[0];
  }

  async updatePendingUserOtp(email: string, otp: string): Promise<void> {
    await db.update(pendingUsers)
      .set({ 
        otp: otp,
        createdAt: new Date()
      })
      .where(eq(pendingUsers.email, email));
  }
  
  async updatePendingUserResetToken(email: string, token: string, tokenExpiry: Date): Promise<void> {
    await db.update(pendingUsers)
      .set({ 
        resetToken: token || null,
        tokenExpiry: tokenExpiry || null,
        type: "reset",
        createdAt: new Date()
      })
      .where(eq(pendingUsers.email, email));
  }

  async deletePendingUser(email: string): Promise<void> {
    await db.delete(pendingUsers).where(eq(pendingUsers.email, email));
  }

  // Election methods
  async getElections(): Promise<Election[]> {
    // First, fetch all elections
    const allElections = await db.select().from(elections).orderBy(asc(elections.id));
    
    // Then automatically check and update statuses based on dates
    await this.updateElectionStatusesBasedOnTime(allElections);
    
    // Return the elections with updated statuses
    return allElections;
  }

  async getElection(id: number): Promise<Election | undefined> {
    const result = await db.select().from(elections).where(eq(elections.id, id));
    if (result.length > 0) {
      // Check and update status based on date
      await this.updateElectionStatusBasedOnTime(result[0]);
    }
    return result[0];
  }
  
  // Helper method to update election statuses based on current time
  async updateElectionStatusesBasedOnTime(electionsList: Election[]): Promise<void> {
    const now = new Date();
    const updates: Promise<void>[] = [];
    
    for (const election of electionsList) {
      // Only update blockchain-deployed elections
      if (election.blockchainId !== null) {
        const startDate = new Date(election.startDate);
        const endDate = new Date(election.endDate);
        
        let newStatus = election.status;
        let statusChanged = false;
        
        // Check if election should be active
        if (now >= startDate && now < endDate && election.status === 'upcoming') {
          newStatus = 'active';
          statusChanged = true;
          console.log(`Automatically updating election ${election.id} to active status`);
        } 
        // Check if election should be completed
        else if (now >= endDate && election.status !== 'completed') {
          newStatus = 'completed';
          statusChanged = true;
          console.log(`Automatically updating election ${election.id} to completed status`);
        }
        
        // Update database if status changed
        if (statusChanged) {
          // Update in the database
          updates.push(this.updateElectionStatus(election.id, newStatus));
          // Update the election object for immediate use
          election.status = newStatus;
          
          // Update candidate statuses when election status changes
          // Get all candidates in this election
          const electionCandidatesList = await this.getElectionCandidates(election.id);
          for (const ec of electionCandidatesList) {
            updates.push(this.updateCandidateActiveStatus(ec.candidateId));
            
            if (ec.runningMateId && ec.runningMateId > 0) {
              updates.push(this.updateCandidateActiveStatus(ec.runningMateId));
            }
          }
        }
      }
    }
    
    // Wait for all updates to complete
    if (updates.length > 0) {
      await Promise.all(updates);
    }
  }
  
  // Helper to update a single election's status based on time
  async updateElectionStatusBasedOnTime(election: Election): Promise<void> {
    await this.updateElectionStatusesBasedOnTime([election]);
  }

  async createElection(election: InsertElection): Promise<Election> {
    const result = await db.insert(elections).values({
      ...election,
      createdAt: new Date()
    }).returning();
    return result[0];
  }

  async updateElectionStatus(id: number, status: string): Promise<void> {
    await db.update(elections)
      .set({ status })
      .where(eq(elections.id, id));
      
    // If the election is marked as completed, update candidate statuses
    if (status === 'completed') {
      await this.updateCandidateStatusesForElection(id);
    }
  }

  async deleteElection(id: number): Promise<void> {
    // First, get all affected election-candidate relationships
    const electionCandidatesList = await this.getElectionCandidates(id);
    
    // Collect all affected candidate IDs
    const affectedCandidateIds: number[] = [];
    electionCandidatesList.forEach(ec => {
      if (!affectedCandidateIds.includes(ec.candidateId)) {
        affectedCandidateIds.push(ec.candidateId);
      }
      
      if (ec.runningMateId && ec.runningMateId > 0 && !affectedCandidateIds.includes(ec.runningMateId)) {
        affectedCandidateIds.push(ec.runningMateId);
      }
    });
    
    // Delete all election-candidate relationships for this election
    await db.delete(electionCandidates).where(eq(electionCandidates.electionId, id));
    
    // Delete the election
    await db.delete(elections).where(eq(elections.id, id));
    
    // Update affected candidates' status if they're not in any other elections
    for (const candidateId of affectedCandidateIds) {
      // Check if candidate is still in any elections
      const remainingRelationships = await db.select()
        .from(electionCandidates)
        .where(
          eq(electionCandidates.candidateId, candidateId)
        );
        
      if (remainingRelationships.length === 0) {
        // Also check if they're a running mate in any elections
        const asRunningMate = await db.select()
          .from(electionCandidates)
          .where(
            eq(electionCandidates.runningMateId, candidateId)
          );
          
        if (asRunningMate.length === 0) {
          // If not in any elections, update status to inactive
          await this.updateCandidateStatus(candidateId, "inactive");
        }
      }
    }
  }

  async updateElection(id: number, election: Partial<InsertElection>): Promise<Election> {
    // Handle the blockchain ID update separately to avoid date issues
    if (election.blockchainId !== undefined && Object.keys(election).length === 1) {
      // This is just a blockchain ID update, use a simplified update
      console.log(`Simplified update for blockchainId ${election.blockchainId} on election ${id}`);
      const updated = await db.update(elections)
        .set({ blockchainId: election.blockchainId })
        .where(eq(elections.id, id))
        .returning();
      
      if (!updated.length) {
        throw new Error(`Election with id ${id} not found`);
      }
      
      return updated[0];
    }
    
    // For other updates, proceed normally
    const updateData: any = { ...election };
    
    // Only handle dates if they're present in the update
    if (election.startDate) {
      updateData.startDate = election.startDate instanceof Date ? 
        election.startDate : new Date(election.startDate as string);
    }
    
    if (election.endDate) {
      updateData.endDate = election.endDate instanceof Date ? 
        election.endDate : new Date(election.endDate as string);
    }
    
    const updated = await db.update(elections)
      .set(updateData)
      .where(eq(elections.id, id))
      .returning();
      
    if (!updated.length) {
      throw new Error(`Election with id ${id} not found`);
    }
    
    return updated[0];
  }

  // Candidate methods
  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(asc(candidates.id));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const result = await db.select().from(candidates).where(eq(candidates.id, id));
    return result[0];
  }

  async getCandidateByStudentId(studentId: string): Promise<Candidate | undefined> {
    const result = await db.select().from(candidates).where(eq(candidates.studentId, studentId));
    return result[0];
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const now = new Date();
    const result = await db.insert(candidates).values({
      fullName: candidate.fullName,
      studentId: candidate.studentId,
      faculty: candidate.faculty,
      position: candidate.position,
      status: "inactive", // Default status is inactive until added to an election
      pictureUrl: candidate.pictureUrl || "",
      createdAt: now,
      updatedAt: now
    }).returning();
    return result[0];
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const existingCandidate = await this.getCandidate(id);
    
    if (!existingCandidate) {
      throw new Error(`Candidate with id ${id} not found`);
    }
    
    const updated = await db.update(candidates)
      .set({
        ...candidate,
        pictureUrl: candidate.pictureUrl || existingCandidate.pictureUrl,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, id))
      .returning();
      
    return updated[0];
  }

  async updateCandidateStatus(id: number, status: string): Promise<void> {
    await db.update(candidates)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(candidates.id, id));
  }
  
  // Helper method to update candidate statuses when an election completes
  async updateCandidateStatusesForElection(electionId: number): Promise<void> {
    // Get all candidates in this election
    const electionCandidates = await this.getElectionCandidates(electionId);
    
    // For each candidate, check if they're in any active elections
    for (const ec of electionCandidates) {
      await this.updateCandidateActiveStatus(ec.candidateId);
      
      // Also update running mate if exists
      if (ec.runningMateId && ec.runningMateId > 0) {
        await this.updateCandidateActiveStatus(ec.runningMateId);
      }
    }
  }
  
  // Helper method to determine and update a candidate's status based on elections
  async updateCandidateActiveStatus(candidateId: number): Promise<void> {
    // Get the candidate
    const candidate = await this.getCandidate(candidateId);
    if (!candidate) return;
    
    // Get all elections where the candidate is the main candidate
    const candidateElections = await this.getCandidateElections(candidateId);
    
    // Get all elections where the candidate is a running mate
    const runningMateElections = await db.select()
      .from(electionCandidates)
      .where(eq(electionCandidates.runningMateId, candidateId));

    // If not in any elections at all, mark as inactive immediately
    if (candidateElections.length === 0 && runningMateElections.length === 0) {
      if (candidate.status !== 'inactive') {
        await this.updateCandidateStatus(candidateId, 'inactive');
        console.log(`Candidate ${candidateId} marked inactive - not in any elections`);
      }
      return;
    }
    
    // Get all elections the candidate is part of
    const combinedElectionIds = [
      ...candidateElections.map(ec => ec.electionId),
      ...runningMateElections.map(ec => ec.electionId)
    ];
    
    // Load the actual election details for checking status
    const electionDetails = await Promise.all(
      combinedElectionIds.map(id => this.getElection(id))
    );
    
    // Filter out null values and ensure we're only considering valid elections
    const validElections = electionDetails.filter(e => e !== undefined) as Election[];
    
    // If there are no valid elections, mark as inactive
    if (validElections.length === 0) {
      if (candidate.status !== 'inactive') {
        await this.updateCandidateStatus(candidateId, 'inactive');
        console.log(`Candidate ${candidateId} marked inactive - no valid elections`);
      }
      return;
    }
    
    // Check if the candidate is in any active or upcoming election
    const inActiveElection = validElections.some(e => e.status === 'active');
    const inUpcomingElection = validElections.some(e => e.status === 'upcoming');
    
    // Determine the appropriate status
    let newStatus = 'inactive';
    if (inActiveElection) {
      newStatus = 'active';
    } else if (inUpcomingElection) {
      newStatus = 'pending';
    }
    
    // Update status if needed
    if (candidate.status !== newStatus) {
      await this.updateCandidateStatus(candidateId, newStatus);
      console.log(`Candidate ${candidateId} marked ${newStatus} - based on election status check`);
    } else {
      console.log(`Candidate ${candidateId} status remains ${candidate.status}`);
    }
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  async resetCandidateIds(): Promise<void> {
    // This is a database-level operation not needed in PostgreSQL 
    // as IDs are auto-incremented by the database
    // This method is kept for compatibility with the interface
  }

  // Election-Candidate methods
  async getElectionCandidates(electionId: number): Promise<ElectionCandidate[]> {
    return await db.select()
      .from(electionCandidates)
      .where(eq(electionCandidates.electionId, electionId));
  }

  async getCandidateElections(candidateId: number): Promise<ElectionCandidate[]> {
    return await db.select()
      .from(electionCandidates)
      .where(eq(electionCandidates.candidateId, candidateId));
  }

  async getAllElectionCandidates(): Promise<ElectionCandidate[]> {
    return await db.select().from(electionCandidates);
  }

  async addCandidateToElection(electionCandidate: InsertElectionCandidate): Promise<ElectionCandidate> {
    // First check if this relationship already exists to avoid duplicates
    const existing = await db.select()
      .from(electionCandidates)
      .where(and(
        eq(electionCandidates.electionId, electionCandidate.electionId),
        eq(electionCandidates.candidateId, electionCandidate.candidateId)
      ));
      
    if (existing.length > 0) {
      return existing[0]; // Return the existing relationship
    }
    
    // Insert the relationship
    const result = await db.insert(electionCandidates)
      .values({
        ...electionCandidate,
        runningMateId: electionCandidate.runningMateId || 0,
        createdAt: new Date()
      })
      .returning();
      
    // Get the election to check its status
    const election = await this.getElection(electionCandidate.electionId);
    
    // Update candidate statuses based on the election's current status
    await this.updateCandidateActiveStatus(electionCandidate.candidateId);
    
    // If there's a running mate, update their status too
    if (electionCandidate.runningMateId && electionCandidate.runningMateId > 0) {
      await this.updateCandidateActiveStatus(electionCandidate.runningMateId);
    }
    
    return result[0];
  }

  async removeCandidateFromElection(electionId: number, candidateId: number): Promise<void> {
    // Find the relationship
    const relationships = await db.select()
      .from(electionCandidates)
      .where(and(
        eq(electionCandidates.electionId, electionId),
        eq(electionCandidates.candidateId, candidateId)
      ));
      
    if (relationships.length === 0) {
      return; // Nothing to remove
    }
    
    const relationship = relationships[0];
    const runningMateId = relationship.runningMateId;
    
    // Delete the relationship
    await db.delete(electionCandidates)
      .where(eq(electionCandidates.id, relationship.id));
    
    // Update the candidate's status based on their remaining elections
    await this.updateCandidateActiveStatus(candidateId);
    
    // Also update the running mate's status if there was one
    if (runningMateId && runningMateId > 0) {
      await this.updateCandidateActiveStatus(runningMateId);
    }
  }
}

// Use the DatabaseStorage implementation instead of MemStorage
export const storage = new DatabaseStorage();
