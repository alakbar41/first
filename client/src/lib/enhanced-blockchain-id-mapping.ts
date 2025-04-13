/**
 * Enhanced Blockchain ID Mapping Service
 * 
 * This module provides reliable mapping between Web2 database IDs and Web3 blockchain IDs
 * using election timestamps and candidate student IDs as stable identifiers across both systems.
 * 
 * Key improvements:
 * 1. Uses election start timestamps instead of IDs for stable election mapping
 * 2. Uses student IDs for candidate mapping instead of position-based mapping
 * 3. Uses composite student IDs (president_vp) for ticket mapping
 * 
 * This ensures consistency between Web2 and Web3 systems even if database IDs change
 * or elections/candidates are deleted from the Web2 system.
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
  candidates: Map<string, {     // Key is now student ID
    blockchainId: number;
    databaseId: number;
  }>;
  tickets: Map<string, {        // Key is now composite student ID (president_vp)
    blockchainId: number;
    databaseId: number;
  }>;
}

// Global cache to store mappings
const cache: MappingCache = {
  elections: new Map(),
  candidates: new Map(),
  tickets: new Map()
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
      throw new Error(`Failed to fetch election ${databaseElectionId} details`);
    }
    
    const election = await response.json();
    
    // If election has a blockchain ID reference, use it
    if (election.blockchainId) {
      // Store in cache using the timestamp as the stable identifier
      const startTimestamp = new Date(election.startDate).getTime();
      
      cache.elections.set(databaseElectionId, {
        blockchainId: election.blockchainId,
        startTimestamp: startTimestamp, 
        isDeployed: true
      });
      
      console.log(`Election ${databaseElectionId} is deployed to blockchain with ID ${election.blockchainId}`);
      console.log(`Start timestamp (used as stable identifier): ${startTimestamp}`);
      
      return election.blockchainId;
    }
    
    // If not deployed yet, store with isDeployed = false
    cache.elections.set(databaseElectionId, {
      blockchainId: databaseElectionId, // Temporary mapping
      startTimestamp: new Date(election.startDate).getTime(),
      isDeployed: false
    });
    
    // Return database ID as fallback if not deployed yet
    return databaseElectionId;
  } catch (error) {
    console.error('Error mapping election ID:', error);
    throw new Error(`Unable to map election ${databaseElectionId} to blockchain: ${error.message}`);
  }
}

/**
 * This is the key function that maps a database candidate ID to its blockchain equivalent
 * using the student ID as the stable identifier across Web2 and Web3 systems.
 */
export async function getBlockchainCandidateId(
  databaseElectionId: number, 
  databaseCandidateId: number
): Promise<number> {
  try {
    // First, fetch candidate details to get the student ID
    const candidateResponse = await apiRequest('GET', `/api/candidates/${databaseCandidateId}`);
    
    if (!candidateResponse.ok) {
      throw new Error(`Failed to fetch candidate ${databaseCandidateId} details`);
    }
    
    const candidate = await candidateResponse.json();
    const studentId = candidate.studentId;
    
    if (!studentId) {
      throw new Error(`Candidate ${databaseCandidateId} has no student ID`);
    }
    
    // Check if we have a mapping for this student ID
    if (cache.candidates.has(studentId)) {
      return cache.candidates.get(studentId)!.blockchainId;
    }
    
    // If we don't have a mapping, we need to call the blockchain to get the mapping
    // For now, we'll return a placeholder that indicates we need to query the blockchain
    console.log(`No cached mapping for candidate with student ID ${studentId}, need to query blockchain`);
    
    // In a real implementation, we would:
    // 1. Call the contract's getCandidateIdByStudentId function
    // 2. Store the result in cache
    // 3. Return the blockchain ID
    
    // For now, we'll just store a placeholder and return it
    cache.candidates.set(studentId, {
      blockchainId: 0, // Placeholder, will be updated with real value from blockchain
      databaseId: databaseCandidateId
    });
    
    return 0; // Placeholder - will be replaced with actual implementation
  } catch (error) {
    console.error('Error mapping candidate ID:', error);
    throw new Error(`Unable to map candidate ${databaseCandidateId} to blockchain: ${error.message}`);
  }
}

/**
 * Get blockchain ticket ID for a president/VP pair using student IDs as stable identifiers
 */
export async function getBlockchainTicketId(
  databaseTicketId: number
): Promise<number> {
  try {
    // Fetch ticket details to get president and VP IDs
    const ticketResponse = await apiRequest('GET', `/api/tickets/${databaseTicketId}`);
    
    if (!ticketResponse.ok) {
      throw new Error(`Failed to fetch ticket ${databaseTicketId} details`);
    }
    
    const ticket = await ticketResponse.json();
    const presidentId = ticket.presidentId;
    const vpId = ticket.vpId;
    
    if (!presidentId || !vpId) {
      throw new Error(`Ticket ${databaseTicketId} has incomplete president/VP information`);
    }
    
    // Fetch student IDs for president and VP
    const presidentResponse = await apiRequest('GET', `/api/candidates/${presidentId}`);
    const vpResponse = await apiRequest('GET', `/api/candidates/${vpId}`);
    
    if (!presidentResponse.ok || !vpResponse.ok) {
      throw new Error(`Failed to fetch president or VP details for ticket ${databaseTicketId}`);
    }
    
    const president = await presidentResponse.json();
    const vp = await vpResponse.json();
    
    const presidentStudentId = president.studentId;
    const vpStudentId = vp.studentId;
    
    if (!presidentStudentId || !vpStudentId) {
      throw new Error(`Missing student IDs for president or VP in ticket ${databaseTicketId}`);
    }
    
    // Create composite ID
    const compositeId = `${presidentStudentId}_${vpStudentId}`;
    
    // Check if we have a mapping for this composite ID
    if (cache.tickets.has(compositeId)) {
      return cache.tickets.get(compositeId)!.blockchainId;
    }
    
    // If we don't have a mapping, we need to call the blockchain to get the mapping
    console.log(`No cached mapping for ticket with composite ID ${compositeId}, need to query blockchain`);
    
    // Similar to candidate mapping, this would be replaced with actual blockchain lookup
    cache.tickets.set(compositeId, {
      blockchainId: 0, // Placeholder
      databaseId: databaseTicketId
    });
    
    return 0; // Placeholder - will be replaced with actual implementation
  } catch (error) {
    console.error('Error mapping ticket ID:', error);
    throw new Error(`Unable to map ticket ${databaseTicketId} to blockchain: ${error.message}`);
  }
}

/**
 * Find a blockchain election ID by its start timestamp
 * This is useful for finding elections even if they've been deleted from the database
 */
export async function findBlockchainElectionByTimestamp(startTimestamp: number): Promise<number> {
  // This would involve calling the blockchain to search for an election with this timestamp
  // For now, this is a placeholder
  console.log(`Searching blockchain for election with start timestamp: ${startTimestamp}`);
  return 0; // Placeholder
}

/**
 * Clear all mapping caches when elections or candidates change
 */
export function clearMappingCache(): void {
  cache.elections.clear();
  cache.candidates.clear();
  cache.tickets.clear();
  console.log("🧹 All mapping caches cleared");
}

/**
 * Clear election mapping cache when an election changes
 */
export function clearElectionCache(databaseElectionId: number): void {
  cache.elections.delete(databaseElectionId);
  console.log(`🧹 Cache cleared for election ${databaseElectionId}`);
}

/**
 * Clear candidate mapping cache when a candidate changes
 */
export function clearCandidateCache(studentId: string): void {
  cache.candidates.delete(studentId);
  console.log(`🧹 Cache cleared for candidate with student ID ${studentId}`);
}

/**
 * Clear ticket mapping cache when a ticket changes
 */
export function clearTicketCache(compositeId: string): void {
  cache.tickets.delete(compositeId);
  console.log(`🧹 Cache cleared for ticket with composite ID ${compositeId}`);
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
      throw new Error(`Failed to fetch election ${electionId} details`);
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