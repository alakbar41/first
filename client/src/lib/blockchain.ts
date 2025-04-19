import { ethers } from 'ethers';

/**
 * SimpleUniversityVoting contract ABI
 * This defines the interface to interact with our contract
 */
export const votingContractABI = [
  // Constructor and events omitted for brevity
  
  // Read functions
  "function getElection(uint256 startTime) external view returns (uint8 position, uint256 start, uint256 end, string memory status)",
  "function getVoteCount(uint256 startTime, bytes32 candidateId) external view returns (uint256)",
  "function getAllCandidatesWithVotes(uint256 startTime) external view returns (bytes32[] memory ids, uint256[] memory voteCounts)",
  "function hasVoted(uint256 startTime, address voter) external view returns (bool)",
  
  // Write functions
  "function createElection(uint8 position, uint256 startTime, uint256 endTime, bytes32[] calldata candidateIds) external",
  "function vote(uint256 startTime, bytes32 candidateId) external"
];

// Contract address - will be set from environment variable
let contractAddress: string = '';

/**
 * Convert a student ID to bytes32 format for the smart contract
 */
export function studentIdToBytes32(studentId: string): string {
  return ethers.utils.id(studentId); // keccak256 hash
}

/**
 * Connect to the blockchain and return a contract instance
 */
export async function getVotingContract(requireSigner = false) {
  // Check if we're in a browser environment with MetaMask
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected');
  }

  // Get contract address from API if not set
  if (!contractAddress) {
    try {
      const response = await fetch('/api/blockchain/contract-address');
      const data = await response.json();
      contractAddress = data.address;
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }
    } catch (error) {
      console.error('Failed to get contract address:', error);
      throw new Error('Could not retrieve contract address');
    }
  }

  let provider;
  if (requireSigner) {
    // Request account access if needed
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(contractAddress, votingContractABI, signer);
  } else {
    // Read-only access doesn't require connecting wallet
    provider = new ethers.providers.Web3Provider(window.ethereum);
    return new ethers.Contract(contractAddress, votingContractABI, provider);
  }
}

/**
 * Get election details from the blockchain
 */
export async function getElectionFromBlockchain(startTime: number) {
  try {
    const contract = await getVotingContract();
    const election = await contract.getElection(startTime);
    
    return {
      position: election.position === 0 ? 'Senator' : 'President/VP',
      startTime: new Date(Number(election.start) * 1000),
      endTime: new Date(Number(election.end) * 1000),
      status: election.status
    };
  } catch (error) {
    console.error('Error fetching election from blockchain:', error);
    throw error;
  }
}

/**
 * Get all candidates with vote counts for an election
 */
export async function getCandidateVotes(startTime: number) {
  try {
    const contract = await getVotingContract();
    const result = await contract.getAllCandidatesWithVotes(startTime);
    
    // Map bytes32 ids back to student IDs
    // This requires the backend to maintain a mapping
    const candidatesWithVotes = await Promise.all(
      result.ids.map(async (id: string, index: number) => {
        // Get student ID from the bytes32 hash
        const studentIdResponse = await fetch(`/api/blockchain/student-id-from-hash/${id}`);
        const { studentId } = await studentIdResponse.json();
        
        return {
          studentId,
          voteCount: Number(result.voteCounts[index])
        };
      })
    );
    
    return candidatesWithVotes;
  } catch (error) {
    console.error('Error fetching candidate votes:', error);
    throw error;
  }
}

/**
 * Vote for a candidate in an election
 */
export async function voteForCandidate(startTime: number, studentId: string) {
  try {
    const contract = await getVotingContract(true); // Need signer for voting
    const candidateIdBytes32 = studentIdToBytes32(studentId);
    
    const tx = await contract.vote(startTime, candidateIdBytes32);
    await tx.wait(); // Wait for transaction to be mined
    
    return true;
  } catch (error) {
    console.error('Error voting for candidate:', error);
    throw error;
  }
}

/**
 * Check if the current user has voted in an election
 */
export async function hasUserVoted(startTime: number) {
  try {
    const contract = await getVotingContract();
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    
    if (accounts.length === 0) {
      return false; // Not connected
    }
    
    return await contract.hasVoted(startTime, accounts[0]);
  } catch (error) {
    console.error('Error checking if user voted:', error);
    return false;
  }
}

// Add TypeScript types for the window.ethereum object
declare global {
  interface Window {
    ethereum?: any;
  }
}