import { users, pendingUsers, elections, type User, type InsertUser, type PendingUser, type InsertPendingUser, type Election, type InsertElection } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  sessionStore: session.Store;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getPendingUserByEmail(email: string): Promise<PendingUser | undefined>;
  createPendingUser(user: InsertPendingUser): Promise<PendingUser>;
  updatePendingUserOtp(email: string, otp: string): Promise<void>;
  deletePendingUser(email: string): Promise<void>;
  
  // Election methods
  getElections(): Promise<Election[]>;
  getElection(id: number): Promise<Election | undefined>;
  createElection(election: InsertElection): Promise<Election>;
  updateElectionStatus(id: number, status: string): Promise<void>;
  deleteElection(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private pendingUsers: Map<string, PendingUser>;
  private elections: Map<number, Election>;
  sessionStore: session.Store;
  currentId: number;
  currentElectionId: number;

  constructor() {
    this.users = new Map();
    this.pendingUsers = new Map();
    this.elections = new Map();
    this.currentId = 1;
    this.currentElectionId = 1;
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
      startDate: new Date(election.startDate),
      endDate: new Date(election.endDate),
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
    this.elections.delete(id);
  }
}

export const storage = new MemStorage();
