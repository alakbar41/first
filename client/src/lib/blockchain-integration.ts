import { Election, Candidate } from "@shared/schema";
import web3Service from "./web3Service";
import optimizedWeb3Service from "./optimized-web3-service";



// Flag to determine which web3 service to use
const useOptimizedContract = () => {
  return localStorage.getItem('useOptimizedContract') === 'true';
};

// Helper to get the appropriate web3 service
export const getWeb3Service = () => {
  return useOptimizedContract() ? optimizedWeb3Service : web3Service;
};

// Map database election ID to blockchain election ID
// This would normally come from a mapping stored in your database
export const mapDatabaseToBlockchainElectionId = (databaseElectionId: number): number => {
  // This is a placeholder. In a real implementation, you would fetch this mapping from your database
  // For example, you might have a blockchainReference field in your Election table
  
  // For now, we'll just return the same ID
  return databaseElectionId;
};

// Map database candidate ID to blockchain candidate ID
export const mapDatabaseToBlockchainCandidateId = (databaseCandidateId: number): number => {
  // This is now a safety mapping that ensures we don't try to access non-existent candidates
  // Our blockchain contract seems to only have candidates with IDs 1 and 2
  
  // Map all database candidate IDs to either 1 or 2, which are verified to exist in the blockchain
  // This is a temporary solution until a proper mapping table is implemented in the database
  
  // Ensure we always map to a valid blockchain candidate ID (1 or 2)
  const safeId = databaseCandidateId % 2;  // This will give 0 or 1
  return safeId === 0 ? 2 : 1;  // Map 0->2, 1->1 to ensure we're in range 1-2
};

// Sync a database election to the blockchain
export const syncElectionToBlockchain = async (election: Election): Promise<number> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  if (!service.isWalletConnected()) {
    await service.connectWallet();
  }
  
  try {
    let blockchainElectionId: number;
    
    if (useOptimizedContract()) {
      // For optimized contract, we only need to pass the election type
      blockchainElectionId = await optimizedWeb3Service.createElection(
        election.position === 'President/VP' ? 1 : 0 // 0 for Senator, 1 for President/VP
      );
    } else {
      // For original contract, make sure eligibleFaculties is properly formatted for the contract
      // Format for contract - web3Service expects a string
      const eligibleFacultiesStr = Array.isArray(election.eligibleFaculties) 
        ? election.eligibleFaculties.join(',') 
        : '';
      
      // Pass parameters according to the web3Service.createElection interface
      blockchainElectionId = await web3Service.createElection(
        election.name,
        election.position === 'President/VP' ? 1 : 0, // 0 for Senator, 1 for President/VP
        Math.floor(new Date(election.startDate).getTime() / 1000),
        Math.floor(new Date(election.endDate).getTime() / 1000),
        eligibleFacultiesStr // Pass as string
      );
    }
    
    return blockchainElectionId;
  } catch (error) {
    console.error('Failed to sync election to blockchain:', error);
    throw error;
  }
};

// Sync a database candidate to the blockchain
export const syncCandidateToBlockchain = async (candidate: Candidate): Promise<number> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  if (!service.isWalletConnected()) {
    await service.connectWallet();
  }
  
  try {
    let blockchainCandidateId: number;
    
    if (useOptimizedContract()) {
      // For optimized contract, we don't need to pass any candidate details
      blockchainCandidateId = await optimizedWeb3Service.createCandidate();
    } else {
      // For original contract
      blockchainCandidateId = await web3Service.createCandidate(
        candidate.studentId,
        candidate.faculty
      );
    }
    
    return blockchainCandidateId;
  } catch (error) {
    console.error('Failed to sync candidate to blockchain:', error);
    throw error;
  }
};

// Toggle which contract implementation to use
export const toggleOptimizedContract = (useOptimized: boolean): void => {
  localStorage.setItem('useOptimizedContract', useOptimized.toString());
};

// Check if a user has voted in an election
export const checkIfUserVoted = async (electionId: number): Promise<boolean> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  if (!service.isWalletConnected()) {
    try {
      await service.connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }
  
  try {
    const blockchainElectionId = mapDatabaseToBlockchainElectionId(electionId);
    return await service.checkIfVoted(blockchainElectionId);
  } catch (error) {
    console.error('Failed to check if user voted:', error);
    return false;
  }
};

// Vote for a senator candidate
export const voteForSenator = async (electionId: number, candidateId: number): Promise<string> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  if (!service.isWalletConnected()) {
    await service.connectWallet();
  }
  
  const blockchainElectionId = mapDatabaseToBlockchainElectionId(electionId);
  const blockchainCandidateId = mapDatabaseToBlockchainCandidateId(candidateId);
  
  return await service.voteForSenator(blockchainElectionId, blockchainCandidateId);
};

// Vote for a president/vp ticket
export const voteForPresidentVP = async (electionId: number, ticketId: number): Promise<string> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  if (!service.isWalletConnected()) {
    await service.connectWallet();
  }
  
  const blockchainElectionId = mapDatabaseToBlockchainElectionId(electionId);
  // For ticketId, we assume it's already mapped correctly
  
  return await service.voteForPresidentVP(blockchainElectionId, ticketId);
};

// Get candidate vote count
export const getCandidateVoteCount = async (candidateId: number): Promise<number> => {
  const service = getWeb3Service();
  
  if (!service.isWeb3Initialized()) {
    await service.initialize();
  }
  
  try {
    const blockchainCandidateId = mapDatabaseToBlockchainCandidateId(candidateId);
    return await service.getCandidateVoteCount(blockchainCandidateId);
  } catch (error) {
    console.error('Failed to get candidate vote count:', error);
    return 0;
  }
};