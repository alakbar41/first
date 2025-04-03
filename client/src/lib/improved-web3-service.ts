import { ethers } from 'ethers';
import { IMPROVED_CONTRACT_ABI } from './improved-contract-abi';

// Constants
const POLYGON_AMOY_RPC_URL = 'https://rpc-amoy.polygon.technology';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xb74f07812b45DBec4eC3E577194F6a798a060e5D'; // Deployer: 0x0E6ED3EB1acc94F03006b326C939CeaF8d0953D5

// Contract enums
export enum ElectionType {
  Senator = 0,
  PresidentVP = 1
}

export enum ElectionStatus {
  Pending = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

// Define types for the contract structures
export interface ImprovedElection {
  id: number;
  electionType: ElectionType;
  status: ElectionStatus;
  startTime: number;
  endTime: number;
  totalVotesCast: number;
  resultsFinalized: boolean;
}

export interface VoteCounter {
  id: number;
  voteCount: number;
}

class ImprovedWeb3Service {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: any = null;
  private signer: ethers.Signer | null = null;
  private isInitialized = false;
  private walletAddress = '';

  // Initialize the Web3 service
  async initialize(): Promise<boolean> {
    try {
      if (!CONTRACT_ADDRESS) {
        console.error('Contract address is not set');
        return false;
      }

      // Create provider
      this.provider = new ethers.JsonRpcProvider(POLYGON_AMOY_RPC_URL);
      
      // Create contract interface
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        IMPROVED_CONTRACT_ABI,
        this.provider
      );
      
      // If we have a signer, reconnect the contract with it
      if (this.signer && this.walletAddress) {
        this.contract = this.contract.connect(this.signer);
        console.log('Contract connected with signer for address:', this.walletAddress);
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize ImprovedWeb3Service:', error);
      return false;
    }
  }

  // Create an election on the blockchain - with time bounds
  async createElection(
    electionType: ElectionType,
    startTime: number,
    endTime: number
  ): Promise<number> {
    try {
      // Check if we have required wallet connection
      if (!this.walletAddress || !this.signer) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      // Make absolutely sure the contract is connected with signer
      if (this.contract.runner !== this.signer) {
        console.log('Reconnecting contract with signer...');
        this.contract = this.contract.connect(this.signer);
      }
      
      console.log(`Creating election with type: ${electionType}, startTime: ${startTime}, endTime: ${endTime}`);
      console.log('Using contract address:', CONTRACT_ADDRESS);
      console.log('Connected wallet address:', this.walletAddress);
      
      // Pre-check: Get current election count (not all contracts have this, but it's useful for debugging)
      try {
        const electionCount = await this.contract.getElectionCount();
        console.log('Current election count on the blockchain:', Number(electionCount));
      } catch (error) {
        console.log('Could not get election count (this is just a debug check):', error);
      }
      
      // Debug: Check if these times make sense
      const currentTime = Math.floor(Date.now() / 1000);
      console.log('Current timestamp:', currentTime);
      console.log('Start timestamp is in the future?', startTime > currentTime);
      console.log('End timestamp is after start?', endTime > startTime);
      
      // Try to estimate gas first to get more detailed error messages
      try {
        console.log('Estimating gas for createElection transaction...');
        
        // Try a different approach with higher max fees
        const options = {
          gasLimit: 600000, // Very high gas limit to overcome network congestion
          maxPriorityFeePerGas: ethers.parseUnits("10.0", "gwei"), // Much higher priority fee to prioritize the transaction
          maxFeePerGas: ethers.parseUnits("25.0", "gwei"), // Much higher max fee
          type: 2, // Use EIP-1559 transaction type
        };
        
        console.log('Using options:', options);
        const estimatedGas = await this.contract.createElection.estimateGas(
          electionType,
          startTime,
          endTime,
          options
        );
        console.log('Estimated gas for transaction:', estimatedGas);
      } catch (error) {
        const gasError = error as any; // Type assertion to avoid TypeScript errors
        console.error('Gas estimation failed (transaction would fail):', gasError);
        console.error('Error details:', JSON.stringify(gasError, null, 2));
        
        // Get a better error message if possible
        if (gasError && gasError.message && typeof gasError.message === 'string') {
          if (gasError.message.includes('execution reverted')) {
            // Try to extract revert reason if available
            const revertReason = gasError.message.split('execution reverted: ')[1]?.split('"')[0];
            if (revertReason) {
              throw new Error(`Smart contract rejected the operation: ${revertReason}`);
            } else if (gasError.reason && typeof gasError.reason === 'string') {
              throw new Error(`Smart contract rejected the operation: ${gasError.reason}`);
            } else {
              throw new Error(`
Smart contract rejected the operation. This may be due to:
1. Another election with the same ID already exists
2. The contract has reached its maximum number of elections
3. Time constraints in the contract are not satisfied
4. You don't have permission to create elections

Technical error: ${gasError.message}`);
            }
          } else if (gasError.message.includes('Internal JSON-RPC error')) {
            throw new Error(`
Network error when communicating with blockchain. This may be due to:
1. Network congestion or temporary issues with the Polygon Amoy testnet
2. MetaMask configuration issues - try setting the gas price manually
3. The contract may require more gas than estimated

Try again in a few moments or switch to a different network/wallet.

Technical error: ${gasError.message}`);
          } else if (gasError.code === 'INSUFFICIENT_FUNDS') {
            throw new Error(`Your wallet doesn't have enough MATIC tokens to execute this transaction. Please add funds to your wallet on the Polygon Amoy testnet.`);
          }
        }
        throw error;
      }

      // If gas estimation is successful, proceed with the transaction
      console.log('Sending createElection transaction...');
      
      // Try a different approach with higher max fees
      const options = {
        gasLimit: 600000, // Very high gas limit to overcome network congestion
        maxPriorityFeePerGas: ethers.parseUnits("10.0", "gwei"), // Much higher priority fee to prioritize the transaction
        maxFeePerGas: ethers.parseUnits("25.0", "gwei"), // Much higher max fee
        type: 2, // Use EIP-1559 transaction type
      };
      
      console.log('Using transaction options:', options);
      const tx = await this.contract.createElection(
        electionType,
        startTime,
        endTime,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Get the election ID from the transaction events
      // For a real implementation, you'd parse the event logs
      // For simplicity, assume the first event is ElectionCreated
      console.log('Looking for ElectionCreated event in logs...');
      console.log('Total log entries:', receipt.logs.length);
      
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("ElectionCreated(uint256,uint8,uint256,uint256)")
      );
      
      console.log('Found ElectionCreated event:', event ? 'Yes' : 'No');
      
      if (event) {
        console.log('Event topics:', event.topics);
        const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256'],
          event.topics[1]
        );
        console.log('Decoded election ID:', Number(decodedData[0]));
        return Number(decodedData[0]);
      }
      
      // Fallback - try to get the election ID from election counter
      console.log('Warning: ElectionCreated event not found. Trying alternative method...');
      try {
        const electionCount = await this.contract.getElectionCount();
        console.log('Current election count:', Number(electionCount));
        // Subtract 1 since election IDs are 0-indexed
        return Number(electionCount) - 1;
      } catch (error) {
        console.error('Failed to get election count:', error);
        // Last resort fallback
        console.warn('Using fallback ID 1 - this may not be accurate!');
        return 1;  
      }
    } catch (error) {
      console.error('Failed to create election:', error);
      throw error;
    }
  }

  // Register a voter
  async registerVoter(voterAddress: string): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.registerVoter(voterAddress, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to register voter ${voterAddress}:`, error);
      throw error;
    }
  }

  // Register multiple voters in batch
  async registerVotersBatch(voterAddresses: string[]): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings for batch operations
      const options = {
        gasLimit: 300000, // Higher gas limit for batch operations
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.registerVotersBatch(voterAddresses, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to register voters in batch:`, error);
      throw error;
    }
  }

  // Create a candidate on the blockchain
  async createCandidate(): Promise<number> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 150000, // Moderate gas limit for candidate creation
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.registerCandidate(options);
      
      const receipt = await tx.wait();
      
      // For a real implementation, parse event logs
      // For simplicity, return dummy ID
      return 1;
    } catch (error) {
      console.error('Failed to create candidate:', error);
      throw error;
    }
  }

  // Add a candidate to an election
  async registerCandidateForElection(
    electionId: number,
    candidateId: number
  ): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.addCandidateToElection(
        electionId,
        candidateId,
        options
      );
      
      await tx.wait();
    } catch (error) {
      console.error(`Failed to register candidate ${candidateId} for election ${electionId}:`, error);
      throw error;
    }
  }

  // Create a President/VP ticket
  async createPresidentVPTicket(
    presidentId: number,
    vpId: number
  ): Promise<number> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 150000, // Moderate gas limit for ticket creation
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.createTicket(
        presidentId,
        vpId,
        options
      );
      
      const receipt = await tx.wait();
      
      // For a real implementation, parse event logs
      // For simplicity, return dummy ID
      return 1;
    } catch (error) {
      console.error(`Failed to create President/VP ticket:`, error);
      throw error;
    }
  }

  // Register a ticket for an election
  async registerTicketForElection(
    electionId: number,
    ticketId: number
  ): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.addTicketToElection(
        electionId,
        ticketId,
        options
      );
      
      await tx.wait();
    } catch (error) {
      console.error(`Failed to register ticket ${ticketId} for election ${electionId}:`, error);
      throw error;
    }
  }

  // Start an election
  async startElection(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.updateElectionStatus(
        electionId, 
        ElectionStatus.Active,
        options
      );
      await tx.wait();
    } catch (error) {
      console.error(`Failed to start election ${electionId}:`, error);
      throw error;
    }
  }

  // Stop an election
  async stopElection(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.updateElectionStatus(
        electionId, 
        ElectionStatus.Completed,
        options
      );
      await tx.wait();
    } catch (error) {
      console.error(`Failed to stop election ${electionId}:`, error);
      throw error;
    }
  }

  // Auto-update an election's status based on time
  async autoUpdateElectionStatus(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.autoUpdateElectionStatus(electionId, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to auto-update election status for ${electionId}:`, error);
      throw error;
    }
  }

  // Finalize election results
  async finalizeResults(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Use optimized gas settings
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      const tx = await this.contract.finalizeResults(electionId, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to finalize results for election ${electionId}:`, error);
      throw error;
    }
  }

  // Connect to MetaMask
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Check if already connected
      if (this.walletAddress && this.signer) {
        try {
          // Verify the connection is still valid
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0 && accounts[0].toLowerCase() === this.walletAddress.toLowerCase()) {
            console.log('Wallet already connected, using existing connection');
            return this.walletAddress;
          }
        } catch (checkError) {
          console.log('Error checking existing connection, will reconnect', checkError);
        }
      }

      // Handle the "Already processing" error
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        this.walletAddress = accounts[0];
      } catch (error: any) {
        // If we get the "already processing" error, wait and try to use eth_accounts instead
        if (error.code === -32002) {
          console.log('MetaMask connection already in progress, waiting for user...');
          
          // Create a timeout promise
          const timeout = new Promise<string[]>((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout. Please complete the MetaMask connection request.')), 30000);
          });
          
          // Check for accounts periodically
          const checkAccounts = new Promise<string[]>((resolve) => {
            const checkInterval = setInterval(async () => {
              try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                  clearInterval(checkInterval);
                  resolve(accounts);
                }
              } catch (e) {
                // Ignore errors during polling
              }
            }, 1000);
          });
          
          // Race between timeout and successful connection
          const accounts = await Promise.race([checkAccounts, timeout]);
          this.walletAddress = accounts[0];
        } else {
          // For other errors, throw normally
          throw error;
        }
      }

      // Create Web3Provider using window.ethereum
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      
      // Get signer
      this.signer = await ethersProvider.getSigner();
      
      // Connect contract with signer
      if (this.contract) {
        this.contract = this.contract.connect(this.signer);
      } else if (CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          IMPROVED_CONTRACT_ABI,
          this.signer
        );
      }

      return this.walletAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Get the connected wallet address
  getWalletAddress(): string {
    return this.walletAddress;
  }

  // Check if Web3 service is initialized
  isWeb3Initialized(): boolean {
    return this.isInitialized;
  }

  // Check if wallet is connected
  isWalletConnected(): boolean {
    return !!this.signer && !!this.walletAddress;
  }

  // Get election details
  async getElectionDetails(electionId: number): Promise<ImprovedElection> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const details = await this.contract.getElectionDetails(electionId);
      
      return {
        id: Number(details[0]),
        electionType: Number(details[1]),
        status: Number(details[2]),
        startTime: Number(details[3]),
        endTime: Number(details[4]),
        totalVotesCast: Number(details[5]),
        resultsFinalized: details[6]
      };
    } catch (error) {
      console.error(`Failed to get election details for ID ${electionId}:`, error);
      throw error;
    }
  }

  // Get candidates for a specific election
  async getElectionCandidates(electionId: number): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const candidateIds = await this.contract.getElectionCandidates(electionId);
      return candidateIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get candidates for election ID ${electionId}:`, error);
      throw error;
    }
  }

  // Get tickets for a specific election
  async getElectionTickets(electionId: number): Promise<number[]> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const ticketIds = await this.contract.getElectionTickets(electionId);
      return ticketIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get tickets for election ID ${electionId}:`, error);
      throw error;
    }
  }

  // Get winner of a finalized election
  async getElectionWinner(electionId: number): Promise<{ winnerId: number, votes: number }> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const result = await this.contract.getElectionWinner(electionId);
      return {
        winnerId: Number(result[0]),
        votes: Number(result[1])
      };
    } catch (error) {
      console.error(`Failed to get winner for election ID ${electionId}:`, error);
      throw error;
    }
  }

  // Get candidate vote count
  async getCandidateVoteCount(candidateId: number): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const voteCount = await this.contract.getCandidateVoteCount(candidateId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for candidate ID ${candidateId}:`, error);
      throw error;
    }
  }

  // Get ticket vote count
  async getTicketVoteCount(ticketId: number): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const voteCount = await this.contract.getTicketVoteCount(ticketId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for ticket ID ${ticketId}:`, error);
      throw error;
    }
  }

  // Get next nonce for voter
  async getNextNonce(): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const nonce = await this.contract.getNextNonce();
      return Number(nonce);
    } catch (error) {
      console.error('Failed to get next nonce:', error);
      throw error;
    }
  }

  // Check if voter has already voted in an election
  async checkIfVoted(electionId: number, voterAddress?: string): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const address = voterAddress || this.walletAddress;
      if (!address) {
        throw new Error('No voter address provided');
      }

      return await this.contract.checkIfVoted(electionId, address);
    } catch (error) {
      console.error(`Failed to check if address ${voterAddress || this.walletAddress} voted in election ${electionId}:`, error);
      throw error;
    }
  }

  // Vote for a Senator candidate
  async voteForSenator(electionId: number, candidateId: number): Promise<string> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Get next nonce for anti-replay protection
      const nonce = await this.getNextNonce();

      // Use optimized gas settings for voting
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      // Send the vote transaction with optimized gas settings
      const tx = await this.contract.voteForSenator(electionId, candidateId, nonce, options);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error(`Failed to vote for candidate ${candidateId} in election ${electionId}:`, error);
      throw error;
    }
  }

  // Vote for a President/VP ticket
  async voteForPresidentVP(electionId: number, ticketId: number): Promise<string> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      // Get next nonce for anti-replay protection
      const nonce = await this.getNextNonce();

      // Use optimized gas settings for voting
      const options = {
        gasLimit: 100000,
        maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      };

      // Send the vote transaction with optimized gas settings
      const tx = await this.contract.voteForPresidentVP(electionId, ticketId, nonce, options);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error(`Failed to vote for ticket ${ticketId} in election ${electionId}:`, error);
      throw error;
    }
  }

  // Check if an address is a registered voter
  async isRegisteredVoter(address?: string): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const voterAddress = address || this.walletAddress;
      if (!voterAddress) {
        throw new Error('No address provided');
      }

      return await this.contract.registeredVoters(voterAddress);
    } catch (error) {
      console.error(`Failed to check if ${address || this.walletAddress} is a registered voter:`, error);
      throw error;
    }
  }

  // Listen for blockchain events
  async listenForVoteEvents(callback: (election: number, voter: string) => void): Promise<void> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      // Listen for VoteCast events
      this.contract.on('VoteCast', function(electionId: any, voter: string, nonce: any) {
        callback(Number(electionId), voter);
      });
    } catch (error) {
      console.error('Failed to set up event listener:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const improvedWeb3Service = new ImprovedWeb3Service();
export default improvedWeb3Service;

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}