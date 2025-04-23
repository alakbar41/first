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
  // Use ethers.js v6 keccak256 function
  return ethers.keccak256(ethers.toUtf8Bytes(studentId));
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
      contractAddress = data.contractAddress; // Fixed: changed from data.address to data.contractAddress
      
      console.log('Retrieved contract address:', contractAddress);
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }
    } catch (error) {
      console.error('Failed to get contract address:', error);
      throw new Error('Could not retrieve contract address');
    }
  }

  if (requireSigner) {
    // Request account access if needed
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    // Using ethers.js v6 BrowserProvider instead of Web3Provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, votingContractABI, signer);
  } else {
    // Read-only access doesn't require connecting wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
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
        try {
          // Get student ID from the bytes32 hash
          const studentIdResponse = await fetch(`/api/blockchain/student-id-from-hash/${id}`);
          
          if (!studentIdResponse.ok) {
            throw new Error(`Failed to get student ID for hash: ${id}`);
          }
          
          const { studentId } = await studentIdResponse.json();
          
          return {
            studentId: studentId || 'Unknown Student',
            voteCount: Number(result.voteCounts[index]),
            hash: id // Include hash for debugging
          };
        } catch (error) {
          console.error(`Error mapping hash ${id} to student ID:`, error);
          return {
            studentId: 'Unknown Student',
            voteCount: Number(result.voteCounts[index]),
            hash: id
          };
        }
      })
    );
    
    return candidatesWithVotes;
  } catch (error) {
    console.error('Error fetching candidate votes:', error);
    throw error;
  }
}

/**
 * Get comprehensive election results from the blockchain
 * This function fetches vote counts from the blockchain and matches them with candidate details from the database
 */
export async function getElectionResultsFromBlockchain(electionId: string | number) {
  try {
    // Step 1: Get the election details from our database to get the blockchain ID
    const response = await fetch(`/api/elections/${electionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch election with ID ${electionId}`);
    }
    
    const election = await response.json();
    
    // Step 2: Check if the election has been deployed to the blockchain
    if (!election.blockchainId) {
      console.warn(`Election ${electionId} has not been deployed to the blockchain`);
      return { election, candidates: [], totalVotes: 0, error: "This election has not been deployed to the blockchain" };
    }
    
    const blockchainId = parseInt(election.blockchainId);

    // Step 3: Get vote counts directly from the blockchain
    const contract = await getVotingContract();
    
    // Get all candidates with their vote counts from the blockchain
    console.log(`Getting all candidates with votes from blockchain for election ${blockchainId}`);
    const blockchainResults = await contract.getAllCandidatesWithVotes(blockchainId);
    
    console.log(`Received ${blockchainResults.ids.length} blockchain candidates for election ${blockchainId}`);
    if (blockchainResults.ids.length === 0) {
      return { 
        election, 
        candidates: [], 
        totalVotes: 0, 
        error: "No candidates found on the blockchain for this election" 
      };
    }

    // Create a mapping of candidate ID hashes to vote counts
    const voteCountMap = new Map();
    blockchainResults.ids.forEach((hash: string, index: number) => {
      voteCountMap.set(hash, Number(blockchainResults.voteCounts[index]));
    });
    
    // Calculate total votes
    const totalVotes = blockchainResults.voteCounts.reduce(
      (sum: number, count: any) => sum + Number(count), 0
    );
    
    // Step 4: Get candidate details by fetching from the API using the blockchain hashes
    const candidatesWithVotes = await Promise.all(
      blockchainResults.ids.map(async (hash: string, index: number) => {
        try {
          // Get student ID from the bytes32 hash
          const studentIdResponse = await fetch(`/api/blockchain/student-id-from-hash/${hash}`);
          
          if (!studentIdResponse.ok) {
            throw new Error(`Failed to get student ID for hash: ${hash}`);
          }
          
          const { studentId } = await studentIdResponse.json();
          
          if (!studentId) {
            console.warn(`No student ID found for hash ${hash}`);
            return {
              id: index,
              fullName: `Candidate ${index + 1}`,
              studentId: 'Unknown',
              faculty: 'Unknown',
              position: 'Unknown',
              voteCount: Number(blockchainResults.voteCounts[index]),
              percentage: totalVotes > 0 ? Math.round((Number(blockchainResults.voteCounts[index]) / totalVotes) * 100) : 0,
              hash
            };
          }
          
          // Try to get more details from the candidate API
          const candidateResponse = await fetch(`/api/candidates/by-student-id/${studentId}`);
          
          if (candidateResponse.ok) {
            const candidate = await candidateResponse.json();
            return {
              ...candidate,
              voteCount: Number(blockchainResults.voteCounts[index]),
              percentage: totalVotes > 0 ? Math.round((Number(blockchainResults.voteCounts[index]) / totalVotes) * 100) : 0,
              hash
            };
          } else {
            // If we can't get candidate details, at least return what we know
            return {
              id: index,
              fullName: `Candidate ${index + 1}`,
              studentId: studentId,
              faculty: 'Unknown',
              position: 'Unknown',
              voteCount: Number(blockchainResults.voteCounts[index]),
              percentage: totalVotes > 0 ? Math.round((Number(blockchainResults.voteCounts[index]) / totalVotes) * 100) : 0,
              hash
            };
          }
        } catch (error) {
          console.error(`Error processing candidate hash ${hash}:`, error);
          return {
            id: index,
            fullName: `Candidate ${index + 1}`,
            studentId: 'Unknown',
            faculty: 'Unknown',
            position: 'Unknown',
            voteCount: Number(blockchainResults.voteCounts[index]),
            percentage: totalVotes > 0 ? Math.round((Number(blockchainResults.voteCounts[index]) / totalVotes) * 100) : 0,
            hash
          };
        }
      })
    );
    
    // Sort candidates by vote count (highest first)
    const sortedCandidates = candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount);
    
    return {
      election,
      candidates: sortedCandidates,
      totalVotes,
      error: null
    };
  } catch (error) {
    console.error('Error fetching election results from blockchain:', error);
    return {
      election: null,
      candidates: [],
      totalVotes: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Vote for a candidate in an election
 */
export async function voteForCandidate(startTime: number, candidateHash: string) {
  try {
    // First, ensure MetaMask is installed and accessible
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask is not installed or not accessible');
    }
    
    // We're only keeping Layer 2 server-side verification for simplicity
    // The backend will check if the user has already participated in this election
    // This removes the duplicate Layer 1 client-side check
    
    // Explicitly request account access to trigger MetaMask popup if not connected
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    const contract = await getVotingContract(true); // Need signer for voting
    
    console.log(`Voting for candidate with hash ${candidateHash} in election ${startTime}`);
    
    // Send transaction to blockchain - let MetaMask handle gas estimation
    const tx = await contract.vote(startTime, candidateHash);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    // Notify backend about the vote for backup/analytics and email confirmation
    // First get a CSRF token
    const csrfResponse = await fetch('/api/csrf-token');
    const csrfData = await csrfResponse.json();
    
    // Make the API call to the server to record vote participation and send confirmation email
    const recordResponse = await fetch('/api/blockchain/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfData.csrfToken
      },
      body: JSON.stringify({
        electionId: startTime,
        candidateHash: candidateHash,
        txHash: tx.hash // Add transaction hash for email confirmations
      })
    });
    
    // Log the server response for debugging
    const recordResult = await recordResponse.json();
    console.log('Server vote record response:', recordResult);
    
    return true;
  } catch (error: any) {
    console.error('Error voting for candidate:', error);
    
    // Provide more detailed error message based on the type of error
    if (error.message) {
      // Handle contract-specific errors
      if (error.message.includes('Not active')) {
        throw new Error('This election is not currently active');
      } else if (error.message.includes('Already voted')) {
        throw new Error('You have already voted in this election');
      } else if (error.message.includes('Candidate not found')) {
        throw new Error('Invalid candidate selection');
      }
      
      // Handle JSON-RPC errors with custom messages for better user understanding
      if (error.code === -32603 || error.message.includes('Internal JSON-RPC error')) {
        // Try to extract nested error if possible
        let innerError = '';
        try {
          // Various formats the error might be in
          if (error.error && error.error.message) {
            innerError = error.error.message;
          } else if (error.data && error.data.message) {
            innerError = error.data.message;
          } else if (typeof error.error === 'string') {
            innerError = error.error;
          }
        } catch (e) {
          console.warn('Failed to extract inner error details:', e);
        }
        
        // Common RPC error scenarios
        if (innerError.includes('gas')) {
          throw new Error('Transaction failed: Not enough gas or gas estimation failed. Please try again with higher gas limits in MetaMask.');
        } else if (innerError.includes('nonce')) {
          throw new Error('Transaction failed: Nonce issue. Try resetting your MetaMask account in Settings > Advanced > Reset Account.');
        } else if (innerError.includes('underpriced')) {
          throw new Error('Transaction failed: Gas price too low. Please increase gas price in MetaMask settings.');
        } else if (innerError.includes('balance')) {
          throw new Error('Transaction failed: Not enough funds for gas. Please add more MATIC to your wallet.');
        } else {
          // More general error for other JSON-RPC issues
          console.log('MetaMask error details:', error);
          throw new Error('Network connection issue. This might be due to network congestion or MetaMask configuration. Please try again in a few moments.');
        }
      }
      
      // Handle other common MetaMask errors
      if (error.message.includes('user rejected')) {
        throw new Error('You cancelled the transaction in MetaMask');
      }
    }
    
    // If we couldn't identify a specific error, throw the original
    throw error;
  }
}

/**
 * Check if the current user has participated in an election
 * 
 * The vote itself is recorded on the blockchain, while the participation record is only stored
 * in the database to track who has already voted. This protects privacy and ensures vote
 * transparency.
 */
export async function hasUserVoted(startTime: number) {
  try {
    const contract = await getVotingContract();
    
    // Try to get accounts, but don't force a connection popup for this read-only check
    // Use eth_accounts instead of eth_requestAccounts to avoid prompting unnecessarily
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    
    if (accounts.length === 0) {
      return false; // Not connected, but don't force connection for this check
    }
    
    return await contract.hasVoted(startTime, accounts[0]);
  } catch (error) {
    console.error('Error checking if user has participated:', error);
    return false;
  }
}

/**
 * Get a candidate's vote count from the blockchain
 */
export async function getCandidateVoteCount(startTime: number, candidateStudentId: string): Promise<number> {
  try {
    const contract = await getVotingContract();
    
    // Convert student ID to bytes32 hash
    const candidateHash = studentIdToBytes32(candidateStudentId);
    
    // Call the contract's getVoteCount function
    const voteCount = await contract.getVoteCount(startTime, candidateHash);
    
    // Return the vote count as a number
    return Number(voteCount);
  } catch (error: any) {
    // Check if this is a "Candidate not found" error from the blockchain
    if (error?.reason === "Candidate not found" || 
        error?.message?.includes("Candidate not found")) {
      console.warn(`Candidate ${candidateStudentId} not registered in blockchain election ${startTime}, returning 0 votes`);
      // Return 0 instead of throwing an error for candidates not registered in this election
      return 0;
    }
    
    // Log the error but return 0 to avoid breaking the UI
    console.error(`Error getting vote count for candidate ${candidateStudentId}:`, error);
    return 0;
  }
}

/**
 * Get all candidates with their vote counts for an election
 */
export async function getAllCandidatesWithVotes(startTime: number): Promise<{ids: string[], voteCounts: number[]}> {
  try {
    const contract = await getVotingContract();
    
    // Call the contract's getAllCandidatesWithVotes function
    const result = await contract.getAllCandidatesWithVotes(startTime);
    
    // Convert BigInts to numbers for the vote counts
    const voteCounts: number[] = result.voteCounts.map((count: any) => Number(count));
    
    console.log(`Received ${result.ids.length} candidates with votes from blockchain for election ${startTime}`);
    if (result.ids.length > 0) {
      console.log('First candidate hash:', result.ids[0], 'with votes:', voteCounts[0]);
    }
    
    return {
      ids: result.ids,
      voteCounts: voteCounts
    };
  } catch (error: any) {
    // Check if this is an election not found error
    if (error?.reason === "Election not found" || 
        error?.message?.includes("Election not found")) {
      console.warn(`Election ${startTime} not found on blockchain, returning empty results`);
    } else {
      console.error(`Error getting all candidates with votes for election ${startTime}:`, error);
    }
    
    // Return empty arrays to avoid breaking the UI
    return {
      ids: [],
      voteCounts: []
    };
  }
}

/**
 * Deploy an election to the blockchain using MetaMask
 * @param electionId The database ID of the election
 */
export async function deployElectionToBlockchain(electionId: number) {
  try {
    // Check for MetaMask and ensure we're on Polygon Mainnet (chainId: 0x89)
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed or not accessible');
      }
      
      // Request account access - this will prompt the MetaMask popup if not connected
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('Please connect to MetaMask first');
      }
      
      // Get the current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log(`Current chain ID: ${chainId}`);
      
      // Polygon Mainnet: 0x89 (137 in decimal)
      if (chainId !== '0x89') {
        // Ask user to switch to Polygon Mainnet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x89' }], // Polygon Mainnet
          });
          console.log('Successfully switched to Polygon Mainnet');
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x89',
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18
                  },
                  rpcUrls: ['https://polygon-rpc.com/'],
                  blockExplorerUrls: ['https://polygonscan.com/']
                }]
              });
              console.log('Added Polygon Mainnet to MetaMask');
            } catch (addError) {
              throw new Error('Could not add Polygon Mainnet network to MetaMask. Please add it manually.');
            }
          } else {
            throw new Error('Please switch to Polygon Mainnet in MetaMask to continue');
          }
        }
      }
      
      // Create a provider to check and log balance info
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(accounts[0]);
      
      // Convert balance to MATIC (from wei)
      const balanceInMatic = ethers.formatEther(balance);
      console.log(`Current account balance: ${balanceInMatic} MATIC`);
    } catch (error: unknown) {
      console.error('Error checking network or balance:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'string' ? error : 'Unknown network error');
      alert(`Network check failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    // Call the API to prepare the election data
    const response = await fetch(`/api/blockchain/deploy-election/${electionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to prepare election for blockchain');
    }
    
    const data = await response.json();
    console.log('Election prepared for blockchain:', data);
    
    // Get the deployment parameters and check for adjusted start date
    const { deployParams, blockchainId, adjustedStartDate } = data;
    
    // If the start date was adjusted, show a notification to the user
    if (adjustedStartDate) {
      const formattedDate = new Date(adjustedStartDate).toLocaleString();
      console.log(`Warning: Election start date was automatically adjusted to: ${formattedDate}`);
      
      // Show alert with non-blocking notification
      setTimeout(() => {
        alert(`Note: The election start date has been automatically adjusted to ${formattedDate} to ensure it's in the future as required by the blockchain contract.`);
      }, 500); // Small delay to allow the current flow to continue
    }
    
    if (!deployParams) {
      throw new Error('No deployment parameters received from server');
    }
    
    // Connect to MetaMask and get contract with signer
    const contract = await getVotingContract(true);
    
    // Validate that the candidateIdBytes is an array with valid bytes32 values for debugging
    if (!Array.isArray(deployParams.candidateIdBytes)) {
      throw new Error('Invalid candidateIdBytes format: expected an array');
    }
    
    // Log detailed information about the candidate bytes to help debug format issues
    console.log('Candidate ID bytes format check:');
    console.log('- Is array:', Array.isArray(deployParams.candidateIdBytes));
    console.log('- Length:', deployParams.candidateIdBytes.length);
    console.log('- Values:', deployParams.candidateIdBytes);
    
    // Additional checks for each candidate ID to ensure proper formatting
    deployParams.candidateIdBytes.forEach((bytes: string, index: number) => {
      console.log(`Candidate ${index + 1}:`, bytes);
      if (typeof bytes !== 'string') {
        console.error(`Error: Candidate ${index + 1} ID is not a string, it's a ${typeof bytes}`);
      } else if (!bytes.startsWith('0x')) {
        console.error(`Error: Candidate ${index + 1} ID does not start with 0x: ${bytes}`);
      } else if (bytes.length !== 66) { // 0x + 64 hex chars = 66
        console.error(`Error: Candidate ${index + 1} ID has incorrect length ${bytes.length}, expected 66: ${bytes}`);
      }
    });
    
    // Send transaction to blockchain
    console.log(`Creating election on blockchain with parameters:`, deployParams);
    
    // Let MetaMask handle gas estimation on its own for better reliability
    console.log('Calling contract function and letting MetaMask estimate gas');
    
    // Call the contract method without specifying gas parameters
    const tx = await contract.createElection(
      deployParams.positionEnum,
      deployParams.startTimestamp,
      deployParams.endTimestamp,
      deployParams.candidateIdBytes
    );
    
    console.log('Transaction sent:', tx.hash);
    
    // Wait for transaction to be mined
    console.log('Waiting for transaction to be mined...');
    const receipt = await tx.wait();
    
    if (!receipt) {
      console.error('No transaction receipt received');
      throw new Error('Transaction was sent but no receipt was received. Check MetaMask for transaction status.');
    }
    
    console.log('Election created on blockchain in block:', receipt.blockNumber);
    
    // Now that the blockchain transaction is confirmed, update the election in our database
    try {
      console.log('Confirming blockchain deployment with server...');
      const confirmResponse = await fetch(`/api/blockchain/confirm-deployment/${electionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blockchainId: blockchainId,
          txHash: tx.hash
        })
      });
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        console.error('Failed to confirm blockchain deployment with server:', errorData);
        // Continue anyway since the blockchain deployment itself succeeded
      } else {
        const confirmData = await confirmResponse.json();
        console.log('Blockchain deployment confirmed with server:', confirmData);
      }
    } catch (confirmError) {
      console.error('Error confirming blockchain deployment with server:', confirmError);
      // Continue anyway since the blockchain deployment itself succeeded
    }
    
    return {
      success: true,
      blockchainId,
      txHash: tx.hash,
      receipt
    };
  } catch (error: any) {
    console.error('Error deploying election to blockchain:', error);
    
    // Capture the specific error message for better diagnostics
    let errorMessage = 'Unknown blockchain error occurred';
    
    if (error.message) {
      console.log('Original error message:', error.message);
      
      // Handle user rejection
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage = 'Transaction was rejected by the user';
      } 
      // Handle RPC errors
      else if (error.message.includes('Internal JSON-RPC error')) {
        errorMessage = 'Blockchain network error: There was an issue with your transaction. Please try refreshing the page and trying again.';
        
        // Try to extract more detailed error information if available
        if (error.data) {
          console.log('RPC Error details:', error.data);
        }
      }
      // Handle gas/fee errors
      else if (error.message.includes('gas') || error.message.includes('fee')) {
        errorMessage = 'Transaction failed due to fee issues. Try adjusting MetaMask settings.';
      }
      // Handle contract execution errors
      else if (error.message.includes('execution reverted')) {
        // Check for specific error reasons from the contract
        if (error.message.includes('Election already exists')) {
          errorMessage = 'This election timestamp already exists on the blockchain. Please modify the start time slightly and try again.';
        }
        else if (error.message.includes('Invalid times')) {
          errorMessage = 'Election times are invalid. The start time must be in the future and end time must be after start time.';
        }
        else if (error.message.includes('At least two candidates required')) {
          errorMessage = 'At least two candidates are required for an election.';
        }
        else if (error.message.includes('Duplicate candidate')) {
          errorMessage = 'One or more candidates have duplicate IDs. Please check the candidate list.';
        }
        else if (error.message.includes('Not authorized')) {
          errorMessage = 'Your account is not authorized to deploy elections. Only the contract owner can do this.';
        }
        else {
          errorMessage = 'Contract execution failed: ' + 
            (error.reason || error.message.substring(error.message.indexOf('execution reverted')));
        }
      }
      // Fallback to the original message
      else {
        errorMessage = error.message;
      }
    }
    
    // Ensure we don't try to confirm blockchain deployment since it failed
    console.error('Blockchain deployment failed:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Add TypeScript types for the window.ethereum object
declare global {
  interface Window {
    ethereum?: any;
  }
}