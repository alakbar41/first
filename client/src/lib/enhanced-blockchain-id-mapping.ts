import { ethers } from 'ethers';
import { apiRequest } from './queryClient';
import studentIdWeb3Service from './student-id-web3-service';

/**
 * Enhanced ID Mapping Module
 * 
 * This module provides an enhanced approach to mapping between Web2 (database) IDs
 * and Web3 (blockchain) IDs using stable identifiers - timestamps for elections
 * and student IDs for candidates.
 * 
 * This overcomes limitations in the previous approach where Web2 IDs must exactly
 * match Web3 IDs, which breaks when records are deleted from the database.
 */

// Election mapping approach: Use timestamps for stable identification
export async function mapElectionFromWeb2ToWeb3(electionId: number): Promise<number | null> {
  try {
    // Fetch election details from Web2 database
    const response = await apiRequest('GET', `/api/elections/${electionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch election details for ID ${electionId}`);
    }
    
    const election = await response.json();
    
    // Use startTime as a stable identifier
    if (!election.startTime) {
      console.warn(`Election ${electionId} has no start time, cannot reliably map to blockchain`);
      return null;
    }
    
    // Convert database timestamp to Unix timestamp (seconds)
    const startTimestamp = Math.floor(new Date(election.startTime).getTime() / 1000);
    
    // TODO: Fetch elections from blockchain and find one with matching timestamp
    // For now, we'll just return a simple placeholder approach 
    
    // Placeholder: Try to use the same ID if blockchain IDs start from 1
    return electionId;
    
    // Future implementation:
    /*
    // Get elections from blockchain (via Web3 service)
    const blockchainElections = await getAllBlockchainElections();
    
    // Find election with matching timestamp
    for (const blkElection of blockchainElections) {
      if (blkElection.startTime === startTimestamp) {
        return blkElection.id;
      }
    }
    
    return null;
    */
  } catch (error) {
    console.error(`Failed to map election ${electionId} from Web2 to Web3:`, error);
    return null;
  }
}

// Candidate mapping approach: Use student IDs for stable identification
export async function mapCandidateFromWeb2ToWeb3(candidateId: number): Promise<number | null> {
  try {
    // Fetch candidate details from Web2 database
    const response = await apiRequest('GET', `/api/candidates/${candidateId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch candidate details for ID ${candidateId}`);
    }
    
    const candidate = await response.json();
    
    // Use student ID as a stable identifier
    if (!candidate.studentId) {
      console.warn(`Candidate ${candidateId} has no student ID, cannot reliably map to blockchain`);
      return null;
    }
    
    try {
      // Use the student ID to look up the blockchain candidate ID
      const blockchainCandidateId = await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
      return blockchainCandidateId;
    } catch (error) {
      console.warn(`Failed to find blockchain candidate with student ID ${candidate.studentId}:`, error);
      return null;
    }
  } catch (error: any) {
    console.error(`Failed to map candidate ${candidateId} from Web2 to Web3:`, error);
    return null;
  }
}

// President/VP ticket mapping approach: Use composite student IDs for tickets
export async function mapTicketFromWeb2ToWeb3(ticketId: number): Promise<number | null> {
  try {
    // In a real implementation, we'd fetch the ticket details including president and VP student IDs
    // For this example, we'll simulate fetching president and VP candidate IDs
    
    // Fetch ticket details from Web2 database (mock structure for now)
    const response = await apiRequest('GET', `/api/tickets/${ticketId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ticket details for ID ${ticketId}`);
    }
    
    const ticket = await response.json();
    
    // Get president and VP student IDs
    const presidentStudentId = ticket.presidentStudentId;
    const vpStudentId = ticket.vpStudentId;
    
    if (!presidentStudentId || !vpStudentId) {
      console.warn(`Ticket ${ticketId} is missing student IDs, cannot reliably map to blockchain`);
      return null;
    }
    
    try {
      // Use the student IDs to look up the blockchain ticket ID
      const blockchainTicketId = await studentIdWeb3Service.getTicketIdByStudentIds(
        presidentStudentId,
        vpStudentId
      );
      return blockchainTicketId;
    } catch (error) {
      console.warn(`Failed to find blockchain ticket with student IDs P: ${presidentStudentId}, VP: ${vpStudentId}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Failed to map ticket ${ticketId} from Web2 to Web3:`, error);
    return null;
  }
}

// Helper function to get vote count for a candidate using enhanced ID mapping
export async function getEnhancedCandidateVoteCount(candidateId: number): Promise<number> {
  try {
    // Map Web2 candidate ID to Web3 candidate ID
    const blockchainCandidateId = await mapCandidateFromWeb2ToWeb3(candidateId);
    
    if (!blockchainCandidateId) {
      console.warn(`Could not map candidate ${candidateId} to blockchain ID`);
      return 0;
    }
    
    // Get vote count from blockchain
    const voteCount = await studentIdWeb3Service.getCandidateVoteCount(blockchainCandidateId);
    return voteCount;
  } catch (error: any) {
    console.error(`Failed to get vote count for candidate ${candidateId}:`, error);
    return 0;
  }
}

// Helper function to get vote count for a ticket using enhanced ID mapping
export async function getEnhancedTicketVoteCount(ticketId: number): Promise<number> {
  try {
    // Map Web2 ticket ID to Web3 ticket ID
    const blockchainTicketId = await mapTicketFromWeb2ToWeb3(ticketId);
    
    if (!blockchainTicketId) {
      console.warn(`Could not map ticket ${ticketId} to blockchain ID`);
      return 0;
    }
    
    // Get vote count from blockchain
    const voteCount = await studentIdWeb3Service.getTicketVoteCount(blockchainTicketId);
    return voteCount;
  } catch (error) {
    console.error(`Failed to get vote count for ticket ${ticketId}:`, error);
    return 0;
  }
}

// Helper function for voting using enhanced ID mapping
export async function voteForCandidateEnhanced(
  electionId: number,
  candidateId: number
): Promise<boolean> {
  try {
    // Map Web2 IDs to Web3 IDs
    const blockchainElectionId = await mapElectionFromWeb2ToWeb3(electionId);
    const blockchainCandidateId = await mapCandidateFromWeb2ToWeb3(candidateId);
    
    if (!blockchainElectionId || !blockchainCandidateId) {
      console.error(`Could not map election ${electionId} or candidate ${candidateId} to blockchain IDs`);
      return false;
    }
    
    // Vote on blockchain
    await studentIdWeb3Service.voteForSenator(blockchainElectionId, blockchainCandidateId);
    return true;
  } catch (error: any) {
    console.error(`Failed to vote for candidate in election ${electionId}:`, error);
    throw error;
  }
}

// Helper function for voting on a presidential ticket
export async function voteForTicketEnhanced(
  electionId: number,
  ticketId: number
): Promise<boolean> {
  try {
    // Map Web2 IDs to Web3 IDs
    const blockchainElectionId = await mapElectionFromWeb2ToWeb3(electionId);
    const blockchainTicketId = await mapTicketFromWeb2ToWeb3(ticketId);
    
    if (!blockchainElectionId || !blockchainTicketId) {
      console.error(`Could not map election ${electionId} or ticket ${ticketId} to blockchain IDs`);
      return false;
    }
    
    // Vote on blockchain
    await studentIdWeb3Service.voteForPresidentVP(blockchainElectionId, blockchainTicketId);
    return true;
  } catch (error: any) {
    console.error(`Failed to vote for ticket in election ${electionId}:`, error);
    throw error;
  }
}