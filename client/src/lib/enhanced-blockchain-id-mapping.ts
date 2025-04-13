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

// Election mapping approach: Use the blockchain ID stored in the database
export async function mapElectionFromWeb2ToWeb3(electionId: number): Promise<number | null> {
  try {
    // Fetch election details from Web2 database
    const response = await apiRequest('GET', `/api/elections/${electionId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch election details for ID ${electionId}`);
    }
    
    const election = await response.json();
    
    // Use the blockchain ID stored in the database (if available)
    if (election.blockchainId) {
      console.log(`Using stored blockchain ID ${election.blockchainId} for election ${electionId}`);
      return election.blockchainId;
    }
    
    // If no blockchain ID is stored, election hasn't been deployed to blockchain yet
    console.warn(`Election ${electionId} has no blockchain ID stored, has it been deployed?`);
    return null;
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

// Note: The previous getEnhancedCandidateVoteCount and getEnhancedTicketVoteCount functions
// have been removed as they were not used in the current application version

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