import { users, pendingUsers, elections, candidates, electionCandidates, 
  type User, type InsertUser, 
  type PendingUser, type InsertPendingUser, 
  type Election, type InsertElection,
  type Candidate, type InsertCandidate,
  type ElectionCandidate, type InsertElectionCandidate
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

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
  createPendingUser(user: InsertPendingUser): Promise<PendingUser>;
  updatePendingUserOtp(email: string, otp: string): Promise<void>;
  deletePendingUser(email: string): Promise<void>;
  
  // Election methods
  getElections(): Promise<Election[]>;
  getElection(id: number): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  updateElection(id: number, election: Partial<InsertElection>): Promise<Election>;
  updateElectionStatus(id: number, status: string): Promise<void>;
  deleteElection(id: number): Promise<void>;
  
  // Candidate methods
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidateByStudentId(studentId: string): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  updateCandidateStatus(id: number, status: string): Promise<void>;
  deleteCandidate(id: number): Promise<void>;
  resetCandidateIds(): Promise<void>;
  
  // Election-Candidate methods
  getElectionCandidates(electionId: number): Promise<ElectionCandidate[]>;
  getCandidateElections(candidateId: number): Promise<ElectionCandidate[]>;
  getAllElectionCandidates(): Promise<ElectionCandidate[]>;
  addCandidateToElection(electionCandidate: InsertElectionCandidate): Promise<ElectionCandidate>;
  removeCandidateFromElection(electionId: number, candidateId: number): Promise<void>;
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

  async createPendingUser(user: InsertPendingUser): Promise<PendingUser> {
    const pendingUser: PendingUser = {
      email: user.email,
      password: user.password,
      faculty: user.faculty,
      otp: user.otp,
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
    };
    
    this.elections.set(id, newElection);
    return newElection;
  }

  async updateElectionStatus(id: number, status: string): Promise<void> {
    const election = this.elections.get(id);
    if (election) {
      election.status = status;
      this.elections.set(id, election);
    }
  }
  
  async deleteElection(id: number): Promise<void> {
    // First, identify all affected candidates in this election
    const electionCandidates = await this.getElectionCandidates(id);
    
    // Track candidates and running mates affected by this deletion
    const affectedCandidateIds = new Set<number>();
    for (const ec of electionCandidates) {
      affectedCandidateIds.add(ec.candidateId);
      if (ec.runningMateId) {
        affectedCandidateIds.add(ec.runningMateId);
      }
    }
    
    // Delete each election-candidate relationship
    for (const ec of electionCandidates) {
      this.electionCandidates.delete(ec.id);
    }
    
    // Then delete the election itself
    this.elections.delete(id);
    
    // Now check each affected candidate to see if they're still in any elections
    for (const candidateId of affectedCandidateIds) {
      // Check if candidate is in any elections as either a main candidate or running mate
      const isInOtherElections = Array.from(this.electionCandidates.values()).some(
        ec => ec.candidateId === candidateId || ec.runningMateId === candidateId
      );
      
      // If not in any elections, update status to inactive
      if (!isInOtherElections) {
        const candidate = this.candidates.get(candidateId);
        if (candidate) {
          candidate.status = "inactive";
          candidate.updatedAt = new Date();
          this.candidates.set(candidateId, candidate);
        }
      }
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
    
    // Update candidate status to active
    const candidate = this.candidates.get(electionCandidate.candidateId);
    if (candidate) {
      candidate.status = "active";
      candidate.updatedAt = new Date();
      this.candidates.set(candidate.id, candidate);
    }
    
    // If there's a running mate, update their status too
    if (electionCandidate.runningMateId) {
      const runningMate = this.candidates.get(electionCandidate.runningMateId);
      if (runningMate) {
        runningMate.status = "active";
        runningMate.updatedAt = new Date();
        this.candidates.set(runningMate.id, runningMate);
      }
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
      this.electionCandidates.delete(entry.id);
      
      // Check if candidate is still in any elections
      const otherElections = Array.from(this.electionCandidates.values()).filter(
        (ec) => ec.candidateId === candidateId
      );
      
      // If candidate is not in any other elections, change status to inactive
      if (otherElections.length === 0) {
        const candidate = this.candidates.get(candidateId);
        if (candidate) {
          candidate.status = "inactive";
          candidate.updatedAt = new Date();
          this.candidates.set(candidateId, candidate);
        }
      }
      
      // If there was a running mate, check if they are in any other elections
      if (entry.runningMateId) {
        const runningMateOtherElections = Array.from(this.electionCandidates.values()).filter(
          (ec) => ec.candidateId === entry.runningMateId || ec.runningMateId === entry.runningMateId
        );
        
        // If running mate is not in any other elections, change status to inactive
        if (runningMateOtherElections.length === 0) {
          const runningMate = this.candidates.get(entry.runningMateId);
          if (runningMate) {
            runningMate.status = "inactive";
            runningMate.updatedAt = new Date();
            this.candidates.set(entry.runningMateId, runningMate);
          }
        }
      }
    }
  }
}

export const storage = new MemStorage();
