import { ethers } from 'ethers';

// We'll handle the contract ABI dynamically once it's compiled
// For now, use a placeholder until the contract is compiled and deployed
const CONTRACT_ABI: any[] = [
  // This will be replaced with the actual ABI after compilation
];

// Constants
const POLYGON_AMOY_RPC_URL = 'https://rpc-amoy.polygon.technology';
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

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
export interface Election {
  id: number;
  name: string;
  electionType: ElectionType;
  status: ElectionStatus;
  startTime: number;
  endTime: number;
  eligibleFaculties: string;
  totalVotesCast: number;
  resultsFinalized: boolean;
}

export interface Candidate {
  id: number;
  studentId: string;
  faculty: string;
  voteCount: number;
}

export interface PresidentVPTicket {
  ticketId: number;
  presidentId: number;
  vpId: number;
  voteCount: number;
}

class Web3Service {
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
        CONTRACT_ABI,
        this.provider
      );
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Web3Service:', error);
      return false;
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
          CONTRACT_ABI,
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
  async getElectionDetails(electionId: number): Promise<Election> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const details = await this.contract.getElectionDetails(electionId);
      
      return {
        id: Number(details[0]),
        name: details[1],
        electionType: Number(details[2]),
        status: Number(details[3]),
        startTime: Number(details[4]),
        endTime: Number(details[5]),
        eligibleFaculties: details[6],
        totalVotesCast: Number(details[7]),
        resultsFinalized: details[8]
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

  // Get candidate details
  async getCandidateDetails(candidateId: number): Promise<Candidate> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const candidate = await this.contract.candidates(candidateId);
      
      return {
        id: Number(candidate.id),
        studentId: candidate.studentId,
        faculty: candidate.faculty,
        voteCount: Number(candidate.voteCount)
      };
    } catch (error) {
      console.error(`Failed to get candidate details for ID ${candidateId}:`, error);
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

  // Get ticket details
  async getTicketDetails(ticketId: number): Promise<PresidentVPTicket> {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const ticket = await this.contract.presidentVPTickets(ticketId);
      
      return {
        ticketId: Number(ticket.ticketId),
        presidentId: Number(ticket.presidentId),
        vpId: Number(ticket.vpId),
        voteCount: Number(ticket.voteCount)
      };
    } catch (error) {
      console.error(`Failed to get ticket details for ID ${ticketId}:`, error);
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
      this.contract.on('VoteCast', (electionId, voter) => {
        callback(Number(electionId), voter);
      });
    } catch (error) {
      console.error('Failed to set up event listener:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const web3Service = new Web3Service();
export default web3Service;

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}