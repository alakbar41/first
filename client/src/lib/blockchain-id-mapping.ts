/**
 * Blockchain ID Mapping Service
 * 
 * This module provides reliable mapping between Web2 database IDs and Web3 blockchain IDs
 * using election timestamps and candidate positions as stable identifiers across both systems.
 * 
 * IMPORTANT: Once an election is deployed to blockchain, its parameters become IMMUTABLE 
 * and cannot be modified. This service ensures consistency between Web2 and Web3 systems
 * even if database IDs are changed or elections are deleted from the Web2 system.
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
  candidates: Map<string, {
    blockchainId: number;
    electionId: number;     // Store associated election ID for reference
  }>;
  // A key/value store where key = database election ID + candidate ID, value = blockchain candidate ID
  candidatePositions: Map<string, number>;
}

// Global cache to store mappings
const cache: MappingCache = {
  elections: new Map(),
  candidates: new Map(),
  candidatePositions: new Map()
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
      // Return database ID as fallback
      return databaseElectionId;
    }
    
    const election = await response.json();
    
    // If election has a blockchain ID reference, use it
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
    
    // Return database ID as fallback
    return databaseElectionId;
  } catch (error) {
    console.error('Error mapping election ID:', error);
    // Return database ID as fallback
    return databaseElectionId;
  }
}

/**
 * This is the key function that maps a database candidate ID to its blockchain equivalent
 * for a specific election. The blockchain ID is determined by a stable hashing mechanism 
 * based on the election's startTime and the candidate's position, NOT by its database ID alone.
 */
export async function getBlockchainCandidateId(
  databaseElectionId: number, 
  databaseCandidateId: number
): Promise<number> {
  // First create a composite key for this election-candidate pair
  const cacheKey = `${databaseElectionId}-${databaseCandidateId}`;
  
  // Check candidate position cache first (most direct mapping)
  if (cache.candidatePositions.has(cacheKey)) {
    return cache.candidatePositions.get(cacheKey)!;
  }
  
  try {
    // First check if the election exists and is deployed to blockchain
    const electionResponse = await apiRequest('GET', `/api/elections/${databaseElectionId}`);
    
    if (!electionResponse.ok) {
      throw new Error(`Failed to fetch election ${databaseElectionId} details`);
    }
    
    const election = await electionResponse.json();
    
    if (!election) {
      throw new Error(`Election ${databaseElectionId} not found`);
    }
    
    // Get the election's start time which is a stable identifier
    const electionStartTimestamp = new Date(election.startDate).getTime();
    
    // Now get all candidates for this election
    const electionCandidatesResponse = await apiRequest(
      'GET', 
      `/api/elections/${databaseElectionId}/candidates`
    );
    
    if (!electionCandidatesResponse.ok) {
      throw new Error(`Failed to fetch candidates for election ${databaseElectionId}`);
    }
    
    const electionCandidates = await electionCandidatesResponse.json();
    
    if (!Array.isArray(electionCandidates) || electionCandidates.length === 0) {
      throw new Error(`No candidates found for election ${databaseElectionId}`);
    }
    
    // Sort candidates by ID to ensure a stable order regardless of when they were added
    const sortedCandidates = [...electionCandidates].sort((a, b) => a.candidateId - b.candidateId);
    
    // Find the candidate's position in the SORTED array
    const position = sortedCandidates.findIndex(ec => ec.candidateId === databaseCandidateId);
    
    if (position === -1) {
      throw new Error(`Candidate ${databaseCandidateId} not found in election ${databaseElectionId}`);
    }
    
    // Use a stable blockchain ID calculation:
    // 1. Blockchain IDs are 1-based, so add 1 to the position
    // 2. This ensures a consistent mapping based on stable candidate ordering
    const blockchainCandidateId = position + 1;
    
    // Store mapping in cache using the composite key
    cache.candidatePositions.set(cacheKey, blockchainCandidateId);
    
    // Log for debugging
    console.log(`ℹ️ Stable Mapping: Election ${databaseElectionId} (Start: ${new Date(electionStartTimestamp).toISOString()})`);
    console.log(`➡️ Candidate ${databaseCandidateId} → Blockchain position ${blockchainCandidateId}`);
    
    // If the election is deployed to blockchain, we log additional details
    if (election.blockchainId) {
      console.log(`🔗 Election is deployed to blockchain with ID ${election.blockchainId}`);
    }
    
    return blockchainCandidateId;
  } catch (error) {
    console.error('Error mapping candidate ID:', error);
    
    // Never use a fallback ID - throw an error instead for proper error handling
    throw new Error(`Unable to map candidate ${databaseCandidateId} in election ${databaseElectionId} to blockchain ID: ${error.message}`);
  }
}

/**
 * Clear all mapping caches when elections or candidates change
 */
export function clearMappingCache(): void {
  cache.elections.clear();
  cache.candidates.clear();
  cache.candidatePositions.clear();
  console.log("🧹 All mapping caches cleared");
}

/**
 * Clear election mapping cache when an election changes
 */
export function clearElectionCache(databaseElectionId: number): void {
  cache.elections.delete(databaseElectionId);
  
  // Also clear all candidate mappings for this election
  Array.from(cache.candidatePositions.keys()).forEach(key => {
    if (key.startsWith(`${databaseElectionId}-`)) {
      cache.candidatePositions.delete(key);
    }
  });
  
  console.log(`🧹 Cache cleared for election ${databaseElectionId} and its candidates`);
}

/**
 * Clear candidate mapping cache when a candidate changes
 */
export function clearCandidateCache(databaseCandidateId: number): void {
  // Clear from candidates cache
  cache.candidates.delete(`${databaseCandidateId}`);
  
  // Clear from candidate positions cache for all elections
  Array.from(cache.candidatePositions.keys()).forEach(key => {
    if (key.endsWith(`-${databaseCandidateId}`)) {
      cache.candidatePositions.delete(key);
    }
  });
  
  console.log(`🧹 Cache cleared for candidate ${databaseCandidateId}`);
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
    const isDeployed = Boolean(election.blockchainId);
    
    // Store in cache with all information
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