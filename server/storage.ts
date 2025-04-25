import { 
  User, InsertUser, 
  PendingUser, InsertPendingUser,
  Election, InsertElection,
  Candidate, InsertCandidate,
  ElectionCandidate, InsertElectionCandidate,
  Ticket, InsertTicket,
  VoteParticipation,
  users, pendingUsers, elections, candidates, electionCandidates, 
  tickets, voteParticipation
} from "@shared/schema";
import { and, eq, asc, desc } from "drizzle-orm";
import session, { MemoryStore } from "express-session";
import { db } from "./db";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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
  updatePendingUserOtp(email: string, otp: string, expiresIn?: number): Promise<void>;
  deletePendingUser(email: string): Promise<void>;
  
  // Election methods
  getElections(): Promise<Election[]>;
  getElection(id: number): Promise<Election | undefined>;
  getElectionByBlockchainId(blockchainId: string): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  updateElection(id: number, election: Partial<InsertElection>): Promise<Election>;
  updateElectionStatus(id: number, status: string): Promise<void>;
  updateElectionStatusBasedOnTime(election: Election): Promise<void>;
  deleteElection(id: number): Promise<void>;
  
  // Candidate methods
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  getCandidateByStudentId(studentId: string): Promise<Candidate | undefined>;
  getCandidateByHash(blockchainHash: string): Promise<Candidate | undefined>;
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
  
  // Vote participation methods (for tracking which users have voted in which elections)
  // The blockchain is the source of truth for the actual votes, we only track participation
  hasUserParticipated(userId: number, electionId: number): Promise<boolean>;
  recordVoteParticipation(userId: number, electionId: number): Promise<void>;
  resetVoteParticipation(userId: number, electionId: number): Promise<void>;
  authorizeVoting(userId: number, electionId: number): Promise<{authorized: boolean, message?: string}>;
  
  // Ticket methods
  getTickets(): Promise<Ticket[]>;
  getUserTickets(userId: number): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(userId: number, ticket: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: number, status: string): Promise<Ticket>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pendingUsers: Map<string, PendingUser>;
  private elections: Map<number, Election>;
  private candidates: Map<number, Candidate>;
  private electionCandidates: Map<number, ElectionCandidate>;
  private voteParticipation: Map<string, VoteParticipation>;
  
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
    this.voteParticipation = new Map();
    
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

  async createPendingUser(user: InsertPendingUser): Promise<PendingUser> {
    // Set OTP expiration time to 3 minutes from now by default
    const now = new Date();
    const expiresAt = user.expiresAt instanceof Date
      ? user.expiresAt
      : (user.expiresAt ? new Date(user.expiresAt) : new Date(now.getTime() + 3 * 60 * 1000));
    
    const pendingUser: PendingUser = {
      email: user.email,
      password: user.password,
      faculty: user.faculty,
      otp: user.otp,
      type: user.type || 'registration',
      createdAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
      expiresAt: expiresAt,
      isAdmin: user.isAdmin ?? false
    };
    this.pendingUsers.set(user.email, pendingUser);
    return pendingUser;
  }

  async updatePendingUserOtp(email: string, otp: string, expiresIn: number = 3 * 60 * 1000): Promise<void> {
    const pendingUser = this.pendingUsers.get(email);
    if (pendingUser) {
      const now = new Date();
      pendingUser.otp = otp;
      pendingUser.createdAt = now;
      pendingUser.expiresAt = new Date(now.getTime() + expiresIn); // Set to expire in expiresIn ms (default: 3 minutes)
      this.pendingUsers.set(email, pendingUser);
    }
  }

  async deletePendingUser(email: string): Promise<void> {
    this.pendingUsers.delete(email);
  }

  // The rest of the implementation is omitted for brevity
  
  // Implementation for vote participation tracking methods
  async hasUserParticipated(userId: number, electionId: number): Promise<boolean> {
    // Create a composite key to look up in the map
    const key = `${userId}-${electionId}`;
    return this.voteParticipation.has(key);
  }

  async recordVoteParticipation(userId: number, electionId: number): Promise<void> {
    // Create a composite key for the map
    const key = `${userId}-${electionId}`;
    
    // Create participation record
    const participation: VoteParticipation = {
      id: 0, // Not used in the map implementation
      userId,
      electionId,
      created_at: new Date()
    };
    
    this.voteParticipation.set(key, participation);
  }

  async resetVoteParticipation(userId: number, electionId: number): Promise<void> {
    // Create a composite key to look up in the map
    const key = `${userId}-${electionId}`;
    this.voteParticipation.delete(key);
  }
  
  async authorizeVoting(userId: number, electionId: number): Promise<{authorized: boolean, message?: string}> {
    // Check if the user has already participated in this election
    const hasParticipated = await this.hasUserParticipated(userId, electionId);
    
    if (hasParticipated) {
      return { 
        authorized: false, 
        message: "You have already voted in this election. Each student may only vote once." 
      };
    }
    
    return { authorized: true };
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const pgSession = ConnectPgSimple(session);
    this.sessionStore = new pgSession({
      pool,
      tableName: 'session', // Default session table name for connect-pg-simple
      createTableIfMissing: true
    });
    
    // Initialize default admin and student accounts if they don't exist
    this.initializeDefaultUsers();
  }

  private async initializeDefaultUsers() {
    // Check if admin user exists
    const adminUser = await this.getUserByEmail('admin@ada.edu.az');
    
    if (!adminUser) {
      // Create admin user
      await this.createUser({
        email: 'admin@ada.edu.az',
        password: '$2b$10$pxB6DROWxUGrMa5nrgr9JOcP62WMJ0gQyWYm7VIxyOgaRADqg1BmS', // 'Admin123@'
        faculty: 'ADMIN',
        isAdmin: true
      });
      
      console.log('Created default admin user');
    }
    
    // Check if student user exists
    const studentUser = await this.getUserByEmail('balakbarli14184@ada.edu.az');
    
    if (!studentUser) {
      // Create student user
      await this.createUser({
        email: 'balakbarli14184@ada.edu.az',
        password: '$2b$10$8gvO.0jc/UF0I7NHDJwGyO/Frs76qPNlwXNsCeJHsjv.h2.IlCMSK', // 'Salam123@'
        faculty: 'SITE',
        isAdmin: false
      });
      
      console.log('Created default student user');
    }
  }

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
    await db.update(users)
      .set({ password: newPassword })
      .where(eq(users.email, email));
  }

  async getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
    const result = await db.select().from(pendingUsers).where(eq(pendingUsers.email, email));
    return result[0];
  }

  async createPendingUser(user: InsertPendingUser): Promise<PendingUser> {
    // If pending user already exists, update it instead
    const existingUser = await this.getPendingUserByEmail(user.email);
    
    if (existingUser) {
      await db.update(pendingUsers)
        .set({
          password: user.password,
          faculty: user.faculty,
          otp: user.otp,
          type: user.type || 'registration',
          createdAt: new Date(),
          expiresAt: user.expiresAt || new Date(Date.now() + 3 * 60 * 1000),
          isAdmin: user.isAdmin || false
        })
        .where(eq(pendingUsers.email, user.email));
        
      return {
        ...existingUser,
        password: user.password,
        faculty: user.faculty,
        otp: user.otp,
        type: user.type || 'registration',
        createdAt: new Date(),
        expiresAt: user.expiresAt instanceof Date ? user.expiresAt : new Date(user.expiresAt),
        isAdmin: user.isAdmin || false
      };
    }
    
    // Otherwise create a new pending user
    const result = await db.insert(pendingUsers).values({
      ...user,
      expiresAt: user.expiresAt || new Date(Date.now() + 3 * 60 * 1000),
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updatePendingUserOtp(email: string, otp: string, expiresIn: number = 3 * 60 * 1000): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn);
    
    await db.update(pendingUsers)
      .set({
        otp,
        createdAt: now,
        expiresAt
      })
      .where(eq(pendingUsers.email, email));
  }

  async deletePendingUser(email: string): Promise<void> {
    await db.delete(pendingUsers).where(eq(pendingUsers.email, email));
  }

  // Election methods
  async getElections(): Promise<Election[]> {
    return await db.select().from(elections).orderBy(asc(elections.id));
  }

  async getElection(id: number): Promise<Election | undefined> {
    const result = await db.select().from(elections).where(eq(elections.id, id));
    return result[0];
  }
  
  async getElectionByBlockchainId(blockchainId: string): Promise<Election | undefined> {
    const result = await db.select()
      .from(elections)
      .where(eq(elections.blockchainId, blockchainId));
    
    return result[0];
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
    const result = await db.select()
      .from(candidates)
      .where(eq(candidates.studentId, studentId));
    
    return result[0];
  }
  
  async getCandidateByHash(blockchainHash: string): Promise<Candidate | undefined> {
    const result = await db.select()
      .from(candidates)
      .where(eq(candidates.blockchainHash, blockchainHash));
    
    return result[0];
  }
  
  // Many more database methods would be implemented here
  // For brevity, we're only including a few key methods
  
  // Vote participation methods
  async hasUserParticipated(userId: number, electionId: number): Promise<boolean> {
    const participation = await db.select()
      .from(voteParticipation)
      .where(
        and(
          eq(voteParticipation.userId, userId),
          eq(voteParticipation.electionId, electionId)
        )
      );
    
    return participation.length > 0;
  }
  
  async recordVoteParticipation(userId: number, electionId: number): Promise<void> {
    await db.insert(voteParticipation)
      .values({
        userId,
        electionId
      })
      .onConflictDoNothing(); // In case there's a duplicate entry
    
    console.log(`Recorded vote participation for user ${userId} in election ${electionId} using voteParticipation table`);
  }
  
  async resetVoteParticipation(userId: number, electionId: number): Promise<void> {
    await db.delete(voteParticipation)
      .where(
        and(
          eq(voteParticipation.userId, userId),
          eq(voteParticipation.electionId, electionId)
        )
      );
    
    console.log(`Reset vote participation for user ${userId} in election ${electionId}`);
  }
  
  async authorizeVoting(userId: number, electionId: number): Promise<{authorized: boolean, message?: string}> {
    // Check if the user has already participated in this election
    const hasParticipated = await this.hasUserParticipated(userId, electionId);
    
    if (hasParticipated) {
      return { 
        authorized: false, 
        message: "You have already voted in this election. Each student may only vote once." 
      };
    }
    
    return { authorized: true };
  }
  
  // Ticket methods
  async getTickets(): Promise<Ticket[]> {
    return await db.select().from(tickets).orderBy(asc(tickets.id));
  }
  
  async getUserTickets(userId: number): Promise<Ticket[]> {
    return await db.select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }
  
  async getTicket(id: number): Promise<Ticket | undefined> {
    const result = await db.select().from(tickets).where(eq(tickets.id, id));
    return result[0];
  }
  
  async createTicket(userId: number, ticket: InsertTicket): Promise<Ticket> {
    const now = new Date();
    const result = await db.insert(tickets).values({
      userId,
      title: ticket.title,
      description: ticket.description,
      type: ticket.type,
      status: "open", // Default status for new tickets
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return result[0];
  }
  
  async updateTicketStatus(id: number, status: string): Promise<Ticket> {
    const now = new Date();
    const result = await db.update(tickets)
      .set({ 
        status, 
        updatedAt: now 
      })
      .where(eq(tickets.id, id))
      .returning();
      
    if (!result.length) {
      throw new Error(`Ticket with id ${id} not found`);
    }
    
    return result[0];
  }
  
  // Implementation for the remaining methods would go here
  // For brevity, these have been omitted
  
  async createElection(election: InsertElection): Promise<Election> {
    const result = await db.insert(elections).values({
      ...election,
      status: election.status || 'upcoming'
    }).returning();
    
    return result[0];
  }
  
  async updateElection(id: number, election: Partial<InsertElection>): Promise<Election> {
    const result = await db.update(elections)
      .set(election)
      .where(eq(elections.id, id))
      .returning();
      
    if (!result.length) {
      throw new Error(`Election with id ${id} not found`);
    }
    
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
  
  async updateElectionStatusBasedOnTime(election: Election): Promise<void> {
    // Implement the logic to update election status based on time
    // This is a placeholder implementation
    const now = new Date();
    
    if (now >= election.startDate && now < election.endDate && election.status === 'upcoming') {
      await this.updateElectionStatus(election.id, 'active');
    } else if (now >= election.endDate && election.status !== 'completed') {
      await this.updateElectionStatus(election.id, 'completed');
    }
  }
  
  async deleteElection(id: number): Promise<void> {
    await db.delete(elections).where(eq(elections.id, id));
  }
  
  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const result = await db.insert(candidates).values({
      ...candidate,
      status: "inactive", // Default status
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }
  
  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const result = await db.update(candidates)
      .set({
        ...candidate,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, id))
      .returning();
      
    if (!result.length) {
      throw new Error(`Candidate with id ${id} not found`);
    }
    
    return result[0];
  }
  
  async updateCandidateStatus(id: number, status: string): Promise<void> {
    await db.update(candidates)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(eq(candidates.id, id));
  }
  
  async updateCandidateStatusesForElection(electionId: number): Promise<void> {
    // This is a placeholder implementation
    // You would need to implement the logic to update candidate statuses
    // based on the election status
  }
  
  async updateCandidateActiveStatus(candidateId: number): Promise<void> {
    // This is a placeholder implementation
    // You would need to implement the logic to update candidate active status
  }
  
  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }
  
  async resetCandidateIds(): Promise<void> {
    // This method would need to be implemented to reset candidate IDs
    // This is a placeholder implementation
  }
  
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
    const result = await db.insert(electionCandidates)
      .values(electionCandidate)
      .returning();
      
    return result[0];
  }
  
  async removeCandidateFromElection(electionId: number, candidateId: number): Promise<void> {
    await db.delete(electionCandidates)
      .where(
        and(
          eq(electionCandidates.electionId, electionId),
          eq(electionCandidates.candidateId, candidateId)
        )
      );
  }
}

// Use the DatabaseStorage implementation instead of MemStorage
export const storage = new DatabaseStorage();