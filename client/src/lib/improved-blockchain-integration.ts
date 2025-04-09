import web3Service from './improved-web3-service';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';

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
      
      // Verify the current time is within the election period
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      if (currentTime < electionDetails.startTime) {
        throw new Error(`This election hasn't started yet. It will begin at ${new Date(electionDetails.startTime * 1000).toLocaleString()}.`);
      }
      if (currentTime > electionDetails.endTime) {
        throw new Error(`This election has ended at ${new Date(electionDetails.endTime * 1000).toLocaleString()}.`);
      }
      
    } catch (electionError: any) {
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      // If it's not a revert error, throw the original error
      throw electionError;
    }
    
    console.log(`Submitting vote for Senator candidate ${candidateId} in election ${electionId}...`);
    
    // Submit vote with enhanced error handling
    try {
      // Submit vote transaction
      return await web3Service.voteForSenator(electionId, candidateId);
    } catch (voteError: any) {
      // Enhanced error handling for vote submission
      if (voteError.message?.includes('execution reverted')) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you have already voted, the election status has changed, or there is an issue with the contract implementation.");
      } else if (voteError.message?.includes('insufficient funds')) {
        throw new Error('You do not have enough testnet MATIC to complete this transaction. Please obtain some Polygon Amoy testnet MATIC from a faucet.');
      } else if (voteError.message?.includes('transaction underpriced')) {
        throw new Error('The transaction fee is too low. Please try again with higher gas fees in your wallet settings.');
      }
      
      // If none of the specific errors match, re-throw with the original message
      throw voteError;
    }
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
      
      // Verify the current time is within the election period
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      if (currentTime < electionDetails.startTime) {
        throw new Error(`This election hasn't started yet. It will begin at ${new Date(electionDetails.startTime * 1000).toLocaleString()}.`);
      }
      if (currentTime > electionDetails.endTime) {
        throw new Error(`This election has ended at ${new Date(electionDetails.endTime * 1000).toLocaleString()}.`);
      }
      
    } catch (electionError: any) {
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      // If it's not a revert error, throw the original error
      throw electionError;
    }
    
    console.log(`Submitting vote for President/VP ticket ${ticketId} in election ${electionId}...`);
    
    // Submit vote with enhanced error handling
    try {
      // Submit vote transaction
      return await web3Service.voteForPresidentVP(electionId, ticketId);
    } catch (voteError: any) {
      // Enhanced error handling for vote submission
      if (voteError.message?.includes('execution reverted')) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you have already voted, the election status has changed, or there is an issue with the contract implementation.");
      } else if (voteError.message?.includes('insufficient funds')) {
        throw new Error('You do not have enough testnet MATIC to complete this transaction. Please obtain some Polygon Amoy testnet MATIC from a faucet.');
      } else if (voteError.message?.includes('transaction underpriced')) {
        throw new Error('The transaction fee is too low. Please try again with higher gas fees in your wallet settings.');
      }
      
      // If none of the specific errors match, re-throw with the original message
      throw voteError;
    }
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

// Enhanced voting for senator with custom gas settings and retry mechanism
export const voteForSenatorWithCustomGas = async (
  electionId: number, 
  candidateId: number, 
  retryCount: number = 0
): Promise<string> => {
  try {
    await ensureWalletConnected();
    
    // Check if already voted (important pre-check)
    const hasVoted = await web3Service.checkIfVoted(electionId);
    if (hasVoted) {
      throw new Error('You have already voted in this election.');
    }
    
    // Get election details to verify it's active - crucial check
    try {
      const electionDetails = await web3Service.getElectionDetails(electionId);
      
      // Pre-vote verification - more verbose to help debug
      console.log(`Pre-vote check for election ${electionId}:`, {
        currentStatus: electionDetails.status,
        startTime: new Date(electionDetails.startTime * 1000).toLocaleString(),
        endTime: new Date(electionDetails.endTime * 1000).toLocaleString(),
        currentTime: new Date().toLocaleString(),
        isActive: electionDetails.status === 1,
        retryAttempt: retryCount
      });
      
      if (electionDetails.status !== 1) { // 1 = Active in ElectionStatus enum
        throw new Error(`Cannot vote in election with status: ${electionDetails.status}. Election must be in active status.`);
      }
      
      // Verify the current time is within the election period
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      if (currentTime < electionDetails.startTime) {
        throw new Error(`This election hasn't started yet. It will begin at ${new Date(electionDetails.startTime * 1000).toLocaleString()}.`);
      }
      if (currentTime > electionDetails.endTime) {
        throw new Error(`This election has ended at ${new Date(electionDetails.endTime * 1000).toLocaleString()}.`);
      }
      
    } catch (electionError: any) {
      console.error(`Election status check failed for election ${electionId}:`, electionError);
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      throw electionError;
    }
    
    // Define ULTRA-LOW gas settings for student voting
    // Using absolute minimum values to ensure transactions work with limited testnet MATIC
    const customGasOptions = {
      gasLimit: 80000 + (retryCount * 10000), // Absolute minimum gas limit with tiny increase per retry
      maxPriorityFeePerGas: ethers.parseUnits((0.5 + (retryCount * 0.25)).toString(), "gwei"), // Start at absolute minimum
      maxFeePerGas: ethers.parseUnits((3 + (retryCount * 1)).toString(), "gwei"), // Start at absolute minimum
      type: 2, // Use EIP-1559 transaction type
    };
    
    console.log(`Attempting vote with custom gas settings (retry #${retryCount}):`, customGasOptions);
    
    try {
      // Use gas options explicitly here
      return await web3Service.voteForSenator(electionId, candidateId, customGasOptions);
    } catch (voteError: any) {
      // Detailed error logging for debugging
      console.error(`Vote failed (retry #${retryCount}):`, voteError);
      
      // Handle specific errors
      if (voteError.message?.includes('execution reverted')) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you have already voted, the election status has changed, or there is an issue with the contract implementation.");
      } else if (voteError.message?.includes('insufficient funds')) {
        throw new Error('You do not have enough testnet MATIC to complete this transaction. Please obtain some Polygon Amoy testnet MATIC from a faucet.');
      } else if (voteError.message?.includes('transaction underpriced')) {
        throw new Error('The transaction fee is too low. Please try again with higher gas fees in your wallet settings.');
      }
      
      throw voteError;
    }
  } catch (error: any) {
    console.error(`Error voting for senator (retry #${retryCount}):`, error);
    throw new Error(`Voting failed: ${error.message}`);
  }
};

// Enhanced voting for President/VP with custom gas settings and retry mechanism
export const voteForPresidentVPWithCustomGas = async (
  electionId: number, 
  ticketId: number, 
  retryCount: number = 0
): Promise<string> => {
  try {
    await ensureWalletConnected();
    
    // Check if already voted (important pre-check)
    const hasVoted = await web3Service.checkIfVoted(electionId);
    if (hasVoted) {
      throw new Error('You have already voted in this election.');
    }
    
    // Get election details to verify it's active - crucial check
    try {
      const electionDetails = await web3Service.getElectionDetails(electionId);
      
      // Pre-vote verification - more verbose to help debug
      console.log(`Pre-vote check for election ${electionId}:`, {
        currentStatus: electionDetails.status,
        startTime: new Date(electionDetails.startTime * 1000).toLocaleString(),
        endTime: new Date(electionDetails.endTime * 1000).toLocaleString(),
        currentTime: new Date().toLocaleString(),
        isActive: electionDetails.status === 1,
        retryAttempt: retryCount
      });
      
      if (electionDetails.status !== 1) { // 1 = Active in ElectionStatus enum
        throw new Error(`Cannot vote in election with status: ${electionDetails.status}. Election must be in active status.`);
      }
      
      // Verify the current time is within the election period
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      if (currentTime < electionDetails.startTime) {
        throw new Error(`This election hasn't started yet. It will begin at ${new Date(electionDetails.startTime * 1000).toLocaleString()}.`);
      }
      if (currentTime > electionDetails.endTime) {
        throw new Error(`This election has ended at ${new Date(electionDetails.endTime * 1000).toLocaleString()}.`);
      }
      
    } catch (electionError: any) {
      console.error(`Election status check failed for election ${electionId}:`, electionError);
      if (electionError.message?.includes('revert')) {
        throw new Error(`Election #${electionId} is not available for voting. It might not exist on the blockchain or has expired.`);
      }
      throw electionError;
    }
    
    // Define ULTRA-LOW gas settings for student voting
    // Using absolute minimum values to ensure transactions work with limited testnet MATIC
    const customGasOptions = {
      gasLimit: 80000 + (retryCount * 10000), // Absolute minimum gas limit with tiny increase per retry
      maxPriorityFeePerGas: ethers.parseUnits((0.5 + (retryCount * 0.25)).toString(), "gwei"), // Start at absolute minimum
      maxFeePerGas: ethers.parseUnits((3 + (retryCount * 1)).toString(), "gwei"), // Start at absolute minimum
      type: 2, // Use EIP-1559 transaction type
    };
    
    console.log(`Attempting vote with custom gas settings (retry #${retryCount}):`, customGasOptions);
    
    try {
      // Use gas options explicitly here
      return await web3Service.voteForPresidentVP(electionId, ticketId, customGasOptions);
    } catch (voteError: any) {
      // Detailed error logging for debugging
      console.error(`Vote failed (retry #${retryCount}):`, voteError);
      
      // Handle specific errors
      if (voteError.message?.includes('execution reverted')) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you have already voted, the election status has changed, or there is an issue with the contract implementation.");
      } else if (voteError.message?.includes('insufficient funds')) {
        throw new Error('You do not have enough testnet MATIC to complete this transaction. Please obtain some Polygon Amoy testnet MATIC from a faucet.');
      } else if (voteError.message?.includes('transaction underpriced')) {
        throw new Error('The transaction fee is too low. Please try again with higher gas fees in your wallet settings.');
      }
      
      throw voteError;
    }
  } catch (error: any) {
    console.error(`Error voting for President/VP (retry #${retryCount}):`, error);
    throw new Error(`Voting failed: ${error.message}`);
  }
};

// Export the web3Service for direct access if needed
export default web3Service;
/**
 * EMERGENCY VOTE FUNCTION
 * This function uses the absolute minimum possible gas settings to ensure transaction success
 * in situations where testnet gas limits are constraining student voting
 */
export async function emergencyVoteForSenator(
  electionId: number,
  candidateId: number
): Promise<string> {
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ImprovedOptimizedVotingABI,
      signer
    );
    
    // Use the absolute minimum gas settings
    const options = {
      gasLimit: 80000, // Absolute minimum
      maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"), // Absolute minimum
      maxFeePerGas: ethers.parseUnits("3.0", "gwei"), // Absolute minimum
      type: 2, // Use EIP-1559 transaction type
    };
    
    // Prepare the transaction with minimal gas
    const tx = await contract.voteForSenator.populateTransaction(
      electionId, 
      candidateId, 
      0 // nonce for anti-replay protection
    );
    
    // Add our custom gas options
    const transaction = {
      ...tx,
      ...options
    };
    
    // Send with minimal gas settings
    const txResponse = await signer.sendTransaction(transaction);
    
    // Wait for just 1 confirmation to improve speed
    const receipt = await txResponse.wait(1);
    
    return receipt.hash;
  } catch (error) {
    console.error("Emergency voting failed:", error);
    throw error;
  }
}
