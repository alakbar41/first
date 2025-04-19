import { ethers } from 'ethers';
import { storage } from './storage';

/**
 * SimpleUniversityVoting contract ABI
 * This defines the interface to interact with our contract
 */
const votingContractABI = [
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

// Mapping between bytes32 hashes and student IDs (for lookup)
// This will be populated when elections are created
const studentIdHashMap = new Map<string, string>();

/**
 * Convert a student ID to bytes32 format for the smart contract
 */
export function studentIdToBytes32(studentId: string): string {
  try {
    // Use keccak256 hash with ethers.js v6
    const bytes32Hash = ethers.keccak256(ethers.toUtf8Bytes(studentId));
    
    // Store the mapping for future reference
    studentIdHashMap.set(bytes32Hash, studentId);
    
    console.log(`Generated hash for student ID ${studentId}: ${bytes32Hash}`);
    
    return bytes32Hash;
  } catch (error) {
    console.error('Error generating student ID hash:', error);
    throw error;
  }
}

/**
 * Store the blockchain hash of a student ID to the database
 */
export async function storeStudentIdHash(studentId: string, hash: string) {
  try {
    // Update the candidate with the blockchain hash for future reference
    const candidates = await storage.getCandidateByStudentId(studentId);
    if (candidates) {
      await storage.updateCandidate(candidates.id, { blockchainHash: hash });
    }
  } catch (error) {
    console.error('Error storing student ID hash:', error);
  }
}

/**
 * Get student ID from bytes32 hash
 * Checks both in-memory map and database
 */
export async function getStudentIdFromHash(hash: string): Promise<string | undefined> {
  // First check in-memory map
  const fromMemory = studentIdHashMap.get(hash);
  if (fromMemory) {
    return fromMemory;
  }
  
  // If not found in memory, check database
  try {
    const candidate = await storage.getCandidateByHash(hash);
    if (candidate) {
      // Add to in-memory map for future use
      studentIdHashMap.set(hash, candidate.studentId);
      return candidate.studentId;
    }
  } catch (err) {
    console.error('Error looking up candidate by hash:', err);
  }
  
  return undefined;
}

/**
 * Get contract address from environment variables
 * Returns null if not configured, instead of throwing an error
 */
export function getContractAddress(): string | null {
  const address = process.env.VOTING_CONTRACT_ADDRESS;
  return address || null;
}

/**
 * Get provider from environment variables
 */
export function getProvider() {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  if (!rpcUrl) {
    throw new Error('Polygon RPC URL not configured in environment variables');
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get contract instance (read-only)
 * @throws Error if contract address is not configured
 */
export function getVotingContract() {
  const provider = getProvider();
  const contractAddress = getContractAddress();
  
  if (!contractAddress) {
    throw new Error('Contract address not configured');
  }
  
  // Return read-only contract instance
  return new ethers.Contract(contractAddress, votingContractABI, provider);
}

/**
 * Prepare data for creating an election on the blockchain (client-side)
 * This function no longer actually deploys the election, but returns 
 * the data needed for the client-side MetaMask transaction
 * 
 * @param position The position type for the election
 * @param startTime The election start date
 * @param endTime The election end date
 * @param candidateStudentIds Array of student IDs for candidates
 * @returns An object with startTimestamp for database storage and deployParams for the blockchain transaction
 */
export async function createElection(
  position: string,
  startTime: Date,
  endTime: Date,
  candidateStudentIds: string[]
) {
  try {
    // Import the mapping function from schema
    const { mapPositionToBlockchain } = require('../shared/schema');
    
    // Convert position to enum value (0 for Senator, 1 for President/VP)
    const positionEnum = mapPositionToBlockchain(position);
    
    // Convert dates to Unix timestamps (seconds)
    const startTimestamp = Math.floor(startTime.getTime() / 1000);
    const endTimestamp = Math.floor(endTime.getTime() / 1000);
    
    // Store hashed student IDs for each candidate
    const candidateIdBytes = [];
    for (const studentId of candidateStudentIds) {
      const hash = studentIdToBytes32(studentId);
      candidateIdBytes.push(hash);
      
      // Store the hash in the database for this candidate
      await storeStudentIdHash(studentId, hash);
    }
    
    // Instead of creating the election directly, return the parameters 
    // needed for the client-side MetaMask transaction
    console.log('Election data prepared for client-side creation');
    
    // Return the election ID (start timestamp) for storage in database
    // along with the prepared data for the contract call
    return {
      startTimestamp,
      deployParams: {
        positionEnum,
        startTimestamp,
        endTimestamp,
        candidateIdBytes
      }
    };
  } catch (error) {
    console.error('Error preparing election data for blockchain:', error);
    throw error;
  }
}

/**
 * Get all candidates with votes for an election
 */
export async function getElectionResults(startTimestamp: number) {
  try {
    const contract = getVotingContract();
    const result = await contract.getAllCandidatesWithVotes(startTimestamp);
    
    // Map bytes32 hashes back to student IDs and format the results
    const candidateResults = await Promise.all(
      result.ids.map(async (hash: string, index: number) => {
        // Use the improved function that checks both memory and database
        let studentId = await getStudentIdFromHash(hash);
        
        return {
          studentId: studentId || 'unknown',
          voteCount: Number(result.voteCounts[index]),
          hash // Include the hash for debugging/verification
        };
      })
    );
    
    return candidateResults;
  } catch (error) {
    console.error('Error fetching election results:', error);
    throw error;
  }
}

/**
 * Check if an election exists on the blockchain
 */
export async function checkElectionExists(startTimestamp: number): Promise<boolean> {
  try {
    const contract = getVotingContract();
    await contract.getElection(startTimestamp);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load student ID hash map from database
 * This should be called on server startup to restore the mapping
 */
export function loadStudentIdHashMap(mappings: {hash: string, studentId: string}[]) {
  for (const {hash, studentId} of mappings) {
    studentIdHashMap.set(hash, studentId);
  }
}