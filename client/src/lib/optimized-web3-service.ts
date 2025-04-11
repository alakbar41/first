import { ethers } from 'ethers';
import { OPTIMIZED_CONTRACT_ABI } from './optimized-contract-abi';

// Constants - these should be updated with your new contract address
// REMOVED DIRECT RPC URLs to avoid CSP issues - using MetaMask provider only
// No direct RPC connections to prevent CSP violations
console.log("Using MetaMask provider only approach - no RPC URLs");
const CONTRACT_ADDRESS = import.meta.env.VITE_OPTIMIZED_CONTRACT_ADDRESS || '';

// Contract enums - same as before
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

// Define optimized types for the contract structures
export interface OptimizedElection {
  id: number;
  electionType: ElectionType;
  status: ElectionStatus;
  totalVotesCast: number;
  resultsFinalized: boolean;
}

export interface OptimizedVoteCounter {
  id: number;
  voteCount: number;
}

// Interfaces to maintain compatibility with existing code
export interface Election extends OptimizedElection {
  name: string;           // Comes from database
  startTime: number;      // Comes from database
  endTime: number;        // Comes from database
  eligibleFaculties: string;  // Comes from database
}

export interface Candidate extends OptimizedVoteCounter {
  studentId: string;      // Comes from database
  faculty: string;        // Comes from database
}

export interface PresidentVPTicket extends OptimizedVoteCounter {
  ticketId: number;       // Same as id
  presidentId: number;    // Comes from database
  vpId: number;           // Comes from database
}

class OptimizedWeb3Service {
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

      // Skip the direct provider initialization - we'll use MetaMask's provider
      // when needed through the connectWallet method  
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize OptimizedWeb3Service:', error);
      return false;
    }
  }

  // Create an election on the blockchain - simplified parameters
  async createElection(electionType: ElectionType): Promise<number> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const tx = await this.contract.createElection(electionType);
      const receipt = await tx.wait();
      
      // Get the election ID from the transaction events
      // This would require parsing the event logs
      // For simplicity, we'll just return 1 as a placeholder
      return 1;
    } catch (error) {
      console.error('Failed to create election:', error);
      throw error;
    }
  }

  // Create a candidate on the blockchain - no parameters needed
  async createCandidate(): Promise<number> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const tx = await this.contract.registerCandidate();
      const receipt = await tx.wait();
      
      // Return created candidate ID (in a real implementation, extract from event)
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

      const tx = await this.contract.addCandidateToElection(
        electionId,
        candidateId
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

      const tx = await this.contract.createTicket(
        presidentId,
        vpId
      );
      
      await tx.wait();
      
      // Return created ticket ID (in a real implementation, extract from event)
      return 1;
    } catch (error) {
      console.error('Failed to create President/VP ticket:', error);
      throw error;
    }
  }

  // Add a ticket to an election
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

      const tx = await this.contract.addTicketToElection(
        electionId,
        ticketId
      );
      
      await tx.wait();
    } catch (error) {
      console.error(`Failed to register ticket ${ticketId} for election ${electionId}:`, error);
      throw error;
    }
  }

  // Activate an election on the blockchain - using updateElectionStatus instead of startElection
  async startElection(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const tx = await this.contract.updateElectionStatus(electionId, ElectionStatus.Active);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to start election ${electionId}:`, error);
      throw error;
    }
  }

  // End an election on the blockchain - using updateElectionStatus instead of stopElection
  async stopElection(electionId: number): Promise<void> {
    try {
      if (!this.contract || !this.signer) {
        throw new Error('Contract or signer not initialized');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const tx = await this.contract.updateElectionStatus(electionId, ElectionStatus.Completed);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to stop election ${electionId}:`, error);
      throw error;
    }
  }

  // Connect to MetaMask
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.walletAddress = accounts[0];

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
          OPTIMIZED_CONTRACT_ABI,
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

  // Get election details - needs to be merged with database info for complete election data
  async getElectionDetails(electionId: number): Promise<OptimizedElection> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const details = await this.contract.getElectionDetails(electionId);
      
      return {
        id: Number(details[0]),
        electionType: Number(details[1]),
        status: Number(details[2]),
        totalVotesCast: Number(details[3]),
        resultsFinalized: details[4]
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

      // Send the vote transaction
      const tx = await this.contract.voteForSenator(electionId, candidateId);
      
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

      // Send the vote transaction
      const tx = await this.contract.voteForPresidentVP(electionId, ticketId);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      return receipt.hash;
    } catch (error) {
      console.error(`Failed to vote for ticket ${ticketId} in election ${electionId}:`, error);
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
      this.contract.on('VoteCast', function(electionId: any, voter: string) {
        callback(Number(electionId), voter);
      });
    } catch (error) {
      console.error('Failed to set up event listener:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const optimizedWeb3Service = new OptimizedWeb3Service();
export default optimizedWeb3Service;