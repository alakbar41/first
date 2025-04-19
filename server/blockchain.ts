import { ethers } from 'ethers';

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
  // Use keccak256 hash
  const bytes32Hash = ethers.utils.id(studentId);
  // Store the mapping for future reference
  studentIdHashMap.set(bytes32Hash, studentId);
  return bytes32Hash;
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
 */
export function getStudentIdFromHash(hash: string): string | undefined {
  return studentIdHashMap.get(hash);
}

/**
 * Get contract address from environment variables
 */
export function getContractAddress(): string {
  const address = process.env.VOTING_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('Contract address not configured in environment variables');
  }
  return address;
}

/**
 * Get provider from environment variables
 */
export function getProvider() {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  if (!rpcUrl) {
    throw new Error('Polygon RPC URL not configured in environment variables');
  }
  return new ethers.providers.JsonRpcProvider(rpcUrl);
}

/**
 * Get contract instance with admin wallet
 */
export function getVotingContract(withSigner = false) {
  const provider = getProvider();
  const contractAddress = getContractAddress();
  
  if (withSigner) {
    // Only use admin private key for creating elections
    const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Admin wallet private key not configured');
    }
    const wallet = new ethers.Wallet(privateKey, provider);
    return new ethers.Contract(contractAddress, votingContractABI, wallet);
  }
  
  // Return read-only contract instance
  return new ethers.Contract(contractAddress, votingContractABI, provider);
}

/**
 * Create a new election on the blockchain
 */
export async function createElection(
  position: 'Senator' | 'President/VP',
  startTime: Date,
  endTime: Date,
  candidateStudentIds: string[]
) {
  try {
    const contract = getVotingContract(true); // With signer
    
    // Convert position to enum
    const positionEnum = position === 'Senator' ? 0 : 1;
    
    // Convert dates to timestamps (seconds)
    const startTimestamp = Math.floor(startTime.getTime() / 1000);
    const endTimestamp = Math.floor(endTime.getTime() / 1000);
    
    // Convert student IDs to bytes32
    const candidateIdBytes = candidateStudentIds.map(studentIdToBytes32);
    
    // Create election on blockchain
    const tx = await contract.createElection(
      positionEnum,
      startTimestamp,
      endTimestamp,
      candidateIdBytes
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Election created on blockchain:', receipt.transactionHash);
    
    // Return the election ID (start timestamp) for storage in database
    return startTimestamp;
  } catch (error) {
    console.error('Error creating election on blockchain:', error);
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
    const candidateResults = result.ids.map((id: string, index: number) => {
      const studentId = getStudentIdFromHash(id) || 'unknown';
      return {
        studentId,
        voteCount: Number(result.voteCounts[index])
      };
    });
    
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