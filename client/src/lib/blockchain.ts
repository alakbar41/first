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
 * Vote for a candidate in an election
 */
export async function voteForCandidate(startTime: number, candidateHash: string) {
  try {
    const contract = await getVotingContract(true); // Need signer for voting
    
    console.log(`Voting for candidate with hash ${candidateHash} in election ${startTime}`);
    
    // Send transaction to blockchain
    const tx = await contract.vote(startTime, candidateHash);
    console.log('Transaction sent:', tx.hash);
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);
    
    // Notify backend about the vote for backup/analytics
    await fetch('/api/blockchain/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        electionId: startTime,
        candidateHash: candidateHash
      })
    });
    
    return true;
  } catch (error: any) {
    console.error('Error voting for candidate:', error);
    // Provide more detailed error message
    if (error.message) {
      if (error.message.includes('Not active')) {
        throw new Error('This election is not currently active');
      } else if (error.message.includes('Already voted')) {
        throw new Error('You have already voted in this election');
      } else if (error.message.includes('Candidate not found')) {
        throw new Error('Invalid candidate selection');
      }
    }
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

/**
 * Deploy an election to the blockchain using MetaMask
 * @param electionId The database ID of the election
 */
export async function deployElectionToBlockchain(electionId: number) {
  try {
    // First, check if the user has enough MATIC tokens and is on the correct network
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask is not installed or not accessible');
      }
      
      // Get the current account
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        throw new Error('Please connect to MetaMask first');
      }
      
      // Check if user is on Polygon Amoy testnet
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log(`Current chain ID: ${chainId}`);
      
      // Polygon Amoy testnet chainId is 0x13882 (hex) or 80002 (decimal)
      if (chainId !== '0x13882') {
        const confirmSwitch = confirm(
          "You are not connected to the Polygon Amoy testnet. " +
          "Would you like to switch networks now? " +
          "(If you've already added Polygon Amoy to MetaMask, we'll switch automatically. " +
          "Otherwise, you'll need to add it manually.)"
        );
        
        if (confirmSwitch) {
          try {
            // Try to switch to Polygon Amoy testnet
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x13882' }],
            });
            console.log('Successfully switched to Polygon Amoy testnet');
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x13882',
                      chainName: 'Polygon Amoy Testnet',
                      nativeCurrency: {
                        name: 'MATIC',
                        symbol: 'MATIC',
                        decimals: 18
                      },
                      rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                      blockExplorerUrls: ['https://amoy.polygonscan.com/']
                    },
                  ],
                });
                console.log('Added Polygon Amoy testnet to MetaMask');
              } catch (addError) {
                console.error('Failed to add Polygon Amoy testnet to MetaMask:', addError);
                throw new Error('Please add Polygon Amoy testnet to MetaMask manually');
              }
            } else {
              console.error('Failed to switch to Polygon Amoy testnet:', switchError);
              throw new Error('Failed to switch to Polygon Amoy testnet');
            }
          }
        } else {
          throw new Error('Please switch to Polygon Amoy testnet before deploying');
        }
      }
      
      // Create a provider to check balance
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(accounts[0]);
      
      // Convert balance to MATIC (from wei)
      const balanceInMatic = ethers.formatEther(balance);
      console.log(`Current account balance: ${balanceInMatic} MATIC`);
      
      // If balance is extremely low (less than 0.01 MATIC), warn the user
      if (parseFloat(balanceInMatic) < 0.01) {
        console.warn('Warning: Account balance is very low, transaction may fail');
        alert(`Warning: Your Polygon wallet balance is very low (${balanceInMatic} MATIC). The transaction may fail. Please add MATIC tokens to your wallet on the Polygon Amoy testnet. You can get free test MATIC from https://faucet.polygon.technology/`);
      }
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
    
    // Add explicit gas settings to help with estimation issues
    console.log('Preparing transaction with explicit gas settings');
    
    // Create transaction options with explicit gas parameters
    const overrides = {
      // Use a higher gas limit for Polygon Amoy testnet
      gasLimit: 5000000,
      // Set a slightly higher gas price to ensure the transaction goes through
      maxFeePerGas: ethers.parseUnits('50', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('5', 'gwei')
    };
    
    // Call the contract method with overrides as the last parameter
    const tx = await contract.createElection(
      deployParams.positionEnum,
      deployParams.startTimestamp,
      deployParams.endTimestamp,
      deployParams.candidateIdBytes,
      overrides
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
        errorMessage = 'Polygon Network Error: There was an issue with the Polygon Amoy testnet connection. Please try the following steps:\n\n' +
          '1. Make sure you are connected to the Polygon Amoy testnet in MetaMask\n' +
          '2. Refresh the page and try again\n' +
          '3. If the error persists, Polygon Amoy testnet might be experiencing congestion\n' + 
          '4. Try again later when the network is less congested\n\n' +
          'If you continue to see this error, visit https://status.polygon.technology to check if there are any known issues with the Polygon network';
        
        // Try to extract more detailed error information if available
        if (error.data) {
          console.log('RPC Error details:', error.data);
        }
      }
      // Handle gas errors
      else if (error.message.includes('gas') || error.message.includes('fee')) {
        errorMessage = 'Transaction failed due to gas/fee issues. Try adjusting MetaMask settings.';
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