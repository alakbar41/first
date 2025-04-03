import web3Service from './improved-web3-service';
import { useToast } from '@/hooks/use-toast';

// Initialize the Web3 service
export const initializeWeb3 = async (): Promise<boolean> => {
  try {
    return await web3Service.initialize();
  } catch (error) {
    console.error('Failed to initialize Web3:', error);
    return false;
  }
};

// Connect Wallet
export const connectWallet = async (): Promise<string> => {
  try {
    return await web3Service.connectWallet();
  } catch (error: any) {
    if (error.message?.includes('User rejected')) {
      throw new Error('Wallet connection rejected by user.');
    } else if (error.message?.includes('MetaMask is not installed')) {
      throw new Error('MetaMask extension is not installed. Please install it to proceed.');
    }
    throw error;
  }
};

// Utility function to ensure wallet is connected
export const ensureWalletConnected = async (): Promise<void> => {
  if (!web3Service.isWalletConnected()) {
    await connectWallet();
  }
};

// Get wallet status and address
export const getWalletInfo = () => {
  return {
    isInitialized: web3Service.isWeb3Initialized(),
    isConnected: web3Service.isWalletConnected(),
    address: web3Service.getWalletAddress(),
  };
};

// Register a single voter
export const registerVoter = async (address: string): Promise<void> => {
  try {
    await ensureWalletConnected();
    await web3Service.registerVoter(address);
  } catch (error: any) {
    console.error('Error registering voter:', error);
    throw new Error(`Failed to register voter: ${error.message}`);
  }
};

// Register multiple voters in batch
export const registerVotersBatch = async (addresses: string[]): Promise<void> => {
  try {
    await ensureWalletConnected();
    await web3Service.registerVotersBatch(addresses);
  } catch (error: any) {
    console.error('Error registering voters in batch:', error);
    throw new Error(`Failed to register voters: ${error.message}`);
  }
};

// Check if an address is a registered voter
export const isRegisteredVoter = async (address?: string): Promise<boolean> => {
  try {
    if (!web3Service.isWeb3Initialized()) {
      await initializeWeb3();
    }
    return await web3Service.isRegisteredVoter(address);
  } catch (error) {
    console.error('Error checking voter registration:', error);
    return false;
  }
};

// Auto-update election status based on time
export const autoUpdateElectionStatus = async (electionId: number): Promise<void> => {
  try {
    await ensureWalletConnected();
    await web3Service.autoUpdateElectionStatus(electionId);
  } catch (error: any) {
    console.error('Error updating election status:', error);
    throw new Error(`Failed to update election status: ${error.message}`);
  }
};

// Finalize election results
export const finalizeResults = async (electionId: number): Promise<void> => {
  try {
    await ensureWalletConnected();
    await web3Service.finalizeResults(electionId);
  } catch (error: any) {
    console.error('Error finalizing election results:', error);
    throw new Error(`Failed to finalize results: ${error.message}`);
  }
};

// Get election details
export const getElectionDetails = async (electionId: number) => {
  try {
    if (!web3Service.isWeb3Initialized()) {
      await initializeWeb3();
    }
    return await web3Service.getElectionDetails(electionId);
  } catch (error: any) {
    console.error('Error getting election details:', error);
    throw new Error(`Failed to get election details: ${error.message}`);
  }
};

// Get election winner
export const getElectionWinner = async (electionId: number) => {
  try {
    if (!web3Service.isWeb3Initialized()) {
      await initializeWeb3();
    }
    return await web3Service.getElectionWinner(electionId);
  } catch (error: any) {
    console.error('Error getting election winner:', error);
    throw new Error(`Failed to get election winner: ${error.message}`);
  }
};

// Vote for a Senator candidate
export const voteForSenator = async (electionId: number, candidateId: number): Promise<string> => {
  try {
    await ensureWalletConnected();
    
    // Check if already voted
    const hasVoted = await web3Service.checkIfVoted(electionId);
    if (hasVoted) {
      throw new Error('You have already voted in this election.');
    }
    
    // Get election details to verify it's active
    try {
      const electionDetails = await web3Service.getElectionDetails(electionId);
      if (electionDetails.status !== 1) { // 1 = Active in ElectionStatus enum
        throw new Error(`Cannot vote in election with status: ${electionDetails.status}. Election must be in active status.`);
      }
    } catch (electionError: any) {
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      // If it's not a revert error, throw the original error
      throw electionError;
    }
    
    // Submit vote
    return await web3Service.voteForSenator(electionId, candidateId);
  } catch (error: any) {
    console.error('Error voting for senator:', error);
    throw new Error(`Voting failed: ${error.message}`);
  }
};

// Vote for a President/VP ticket
export const voteForPresidentVP = async (electionId: number, ticketId: number): Promise<string> => {
  try {
    await ensureWalletConnected();
    
    // Check if already voted
    const hasVoted = await web3Service.checkIfVoted(electionId);
    if (hasVoted) {
      throw new Error('You have already voted in this election.');
    }
    
    // Get election details to verify it's active
    try {
      const electionDetails = await web3Service.getElectionDetails(electionId);
      if (electionDetails.status !== 1) { // 1 = Active in ElectionStatus enum
        throw new Error(`Cannot vote in election with status: ${electionDetails.status}. Election must be in active status.`);
      }
    } catch (electionError: any) {
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      // If it's not a revert error, throw the original error
      throw electionError;
    }
    
    // Submit vote
    return await web3Service.voteForPresidentVP(electionId, ticketId);
  } catch (error: any) {
    console.error('Error voting for president/VP ticket:', error);
    throw new Error(`Voting failed: ${error.message}`);
  }
};

// Check if user has voted in a specific election
export const checkIfVoted = async (electionId: number, address?: string): Promise<boolean> => {
  try {
    if (!web3Service.isWeb3Initialized()) {
      await initializeWeb3();
    }
    return await web3Service.checkIfVoted(electionId, address);
  } catch (error) {
    console.error('Error checking voting status:', error);
    return false;
  }
};

// Export the web3Service for direct access if needed
export default web3Service;