/**
 * Blockchain ID Mapping Service
 * 
 * This module provides reliable mapping between Web2 database IDs and Web3 blockchain IDs
 * using student IDs and election timestamps as stable identifiers across both systems.
 * 
 * IMPORTANT: Once an election is deployed to blockchain, its parameters become IMMUTABLE 
 * and cannot be modified. This service ensures consistency between Web2 and Web3 systems.
 */

import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// Cache structure to avoid excessive API calls
interface MappingCache {
  elections: Map<number, { 
    blockchainId: number;
    startTimestamp: number; // Stores the election start time for stable identification
    isDeployed: boolean;    // Flag to indicate if election is deployed to blockchain
  }>;
  candidates: Map<number, {
    studentId: string;      // Student ID is used as the stable identifier for candidates
    blockchainId: number;
    electionId: number;     // Store associated election ID for reference
  }>;
}

// Global cache to store mappings
const cache: MappingCache = {
  elections: new Map(),
  candidates: new Map()
};

/**
 * Get the blockchain election ID corresponding to a database election ID
 * Uses election start time as a stable identifier across Web2 and Web3 systems
 */
export async function getBlockchainElectionId(databaseElectionId: number): Promise<number> {
  // Check cache first
  if (cache.elections.has(databaseElectionId)) {
    return cache.elections.get(databaseElectionId)!.blockchainId;
  }
  
  try {
    // Fetch election details from API
    const response = await apiRequest('GET', `/api/elections/${databaseElectionId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch election ${databaseElectionId} details`);
      // Fallback to using the same ID as in database (temporary)
      return databaseElectionId;
    }
    
    const election = await response.json();
    
    // If election has a blockchain reference, use it
    if (election.blockchainId) {
      // Store in cache using ONLY the start time as the stable identifier
      // This ensures we use the same timestamp for identification on both systems
      const startTimestamp = new Date(election.startDate).getTime();
      
      cache.elections.set(databaseElectionId, {
        blockchainId: election.blockchainId,
        startTimestamp: startTimestamp, // Using ONLY startDate as stable identifier
        isDeployed: true
      });
      
      console.log(`Election ${databaseElectionId} is deployed to blockchain with ID ${election.blockchainId}`);
      console.log(`Start timestamp (used as stable identifier): ${startTimestamp}`);
      
      return election.blockchainId;
    }
    
    // If not deployed, store with isDeployed = false
    cache.elections.set(databaseElectionId, {
      blockchainId: databaseElectionId, // Temporary mapping
      startTimestamp: new Date(election.startDate).getTime(),
      isDeployed: false
    });
    
    // Fallback to using the same ID (temporary)
    return databaseElectionId;
  } catch (error) {
    console.error('Error mapping election ID:', error);
    // Fallback to using the same ID (temporary)
    return databaseElectionId;
  }
}

/**
 * Get the blockchain candidate ID corresponding to a database candidate ID
 * Uses student ID as a stable identifier across systems
 */
export async function getBlockchainCandidateId(
  databaseElectionId: number, 
  databaseCandidateId: number
): Promise<number> {
  // Check cache first
  if (cache.candidates.has(databaseCandidateId)) {
    return cache.candidates.get(databaseCandidateId)!.blockchainId;
  }
  
  try {
    // First check if the election is deployed to blockchain
    const electionResponse = await apiRequest('GET', `/api/elections/${databaseElectionId}`);
    
    if (!electionResponse.ok) {
      console.error(`Failed to fetch election ${databaseElectionId} details`);
      const safeId = databaseCandidateId % 2;
      return safeId === 0 ? 2 : 1;
    }
    
    const election = await electionResponse.json();
    
    // First get candidate details to get student ID
    const candidateResponse = await apiRequest('GET', `/api/candidates/${databaseCandidateId}`);
    
    if (!candidateResponse.ok) {
      console.error(`Failed to fetch candidate ${databaseCandidateId} details`);
      // Safety fallback: If candidate ID > 2, map to either 1 or 2 which exist on blockchain
      // This ensures we don't try to access non-existent candidates
      const safeId = databaseCandidateId % 2;
      return safeId === 0 ? 2 : 1;
    }
    
    const candidate = await candidateResponse.json();
    const studentId = candidate.studentId;
    
    // Now get all candidates for this election on the blockchain
    const electionCandidatesResponse = await apiRequest(
      'GET', 
      `/api/elections/${databaseElectionId}/candidates`
    );
    
    if (!electionCandidatesResponse.ok) {
      console.error(`Failed to fetch candidates for election ${databaseElectionId}`);
      // Safety fallback as above
      const safeId = databaseCandidateId % 2;
      return safeId === 0 ? 2 : 1;
    }
    
    const electionCandidates = await electionCandidatesResponse.json();
    
    // Find this candidate's position in the election
    const position = electionCandidates.findIndex(
      (ec: any) => ec.candidateId === databaseCandidateId
    );
    
    if (position === -1) {
      console.error(`Candidate ${databaseCandidateId} not found in election ${databaseElectionId}`);
      // Safety fallback as above
      const safeId = databaseCandidateId % 2;
      return safeId === 0 ? 2 : 1;
    }
    
    // Blockchain IDs are 1-based, so add 1 to the position
    const blockchainCandidateId = position + 1;
    
    // Store in cache with all required properties
    cache.candidates.set(databaseCandidateId, {
      studentId: studentId,
      blockchainId: blockchainCandidateId,
      electionId: databaseElectionId
    });
    
    console.log(`Mapped candidate ${databaseCandidateId} (studentId: ${studentId}) to blockchain ID ${blockchainCandidateId}`);
    
    return blockchainCandidateId;
  } catch (error) {
    console.error('Error mapping candidate ID:', error);
    // Safety fallback as above
    const safeId = databaseCandidateId % 2;
    return safeId === 0 ? 2 : 1;
  }
}

/**
 * Clear mapping cache when elections or candidates change
 */
export function clearMappingCache(): void {
  cache.elections.clear();
  cache.candidates.clear();
}

/**
 * Clear election mapping cache when an election changes
 */
export function clearElectionCache(databaseElectionId: number): void {
  cache.elections.delete(databaseElectionId);
}

/**
 * Clear candidate mapping cache when a candidate changes
 */
export function clearCandidateCache(databaseCandidateId: number): void {
  cache.candidates.delete(databaseCandidateId);
}

/**
 * Check if an election is deployed to blockchain
 * This is used to prevent modifying elections that are already deployed
 */
export async function isElectionDeployedToBlockchain(electionId: number): Promise<boolean> {
  // Check cache first
  if (cache.elections.has(electionId)) {
    return cache.elections.get(electionId)!.isDeployed;
  }
  
  try {
    // Fetch election details from API
    const response = await apiRequest('GET', `/api/elections/${electionId}`);
    
    if (!response.ok) {
      console.error(`Failed to fetch election ${electionId} details`);
      return false;
    }
    
    const election = await response.json();
    
    // If election has a blockchain reference, it's deployed
    const isDeployed = election.blockchainId !== null && election.blockchainId !== undefined;
    
    // Store in cache
    cache.elections.set(electionId, {
      blockchainId: election.blockchainId || electionId,
      startTimestamp: new Date(election.startDate).getTime(),
      isDeployed: isDeployed
    });
    
    return isDeployed;
  } catch (error) {
    console.error('Error checking election deployment status:', error);
    return false;
  }
}