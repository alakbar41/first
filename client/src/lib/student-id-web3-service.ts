import { ethers } from 'ethers';

// ABI for the ImprovedStudentIdVoting contract - this will be generated when the contract is compiled
// For now, we're using a placeholder that will need to be updated with the actual ABI
const IMPROVED_STUDENT_ID_CONTRACT_ABI = [
  // Events
  "event ElectionCreated(uint256 indexed electionId, uint8 electionType, uint256 startTime, uint256 endTime)",
  "event ElectionStatusChanged(uint256 indexed electionId, uint8 status)",
  "event VoterRegistered(address indexed voter)",
  "event CandidateRegistered(uint256 indexed candidateId, string studentId)",
  "event TicketCreated(uint256 indexed ticketId, string presidentStudentId, string vpStudentId)",
  "event VoteCast(uint256 indexed electionId, address indexed voter, uint256 nonce)",
  "event ResultsFinalized(uint256 indexed electionId, uint256 winnerId, uint256 winnerVotes)",
  
  // View functions
  "function elections(uint256) view returns (uint256 id, uint8 electionType, uint8 status, uint256 startTime, uint256 endTime, uint256 totalVotesCast, bool resultsFinalized)",
  "function candidates(uint256) view returns (uint256 id, string studentId, uint256 voteCount)",
  "function tickets(uint256) view returns (uint256 id, string presidentStudentId, string vpStudentId, uint256 voteCount)",
  "function registeredVoters(address) view returns (bool)",
  "function getNextNonce() view returns (uint256)",
  "function checkIfVoted(uint256 electionId, address voter) view returns (bool)",
  "function getCandidateVoteCount(uint256 candidateId) view returns (uint256)",
  "function getTicketVoteCount(uint256 ticketId) view returns (uint256)",
  "function getElectionWinner(uint256 electionId) view returns (uint256)",
  "function getElectionCandidates(uint256 electionId) view returns (uint256[])",
  "function getElectionTickets(uint256 electionId) view returns (uint256[])",
  "function getElectionDetails(uint256 electionId) view returns (uint256 id, uint8 electionType, uint8 status, uint256 startTime, uint256 endTime, uint256 totalVotesCast, bool resultsFinalized)",
  "function getCandidateIdByStudentId(string) view returns (uint256)",
  "function getTicketIdByStudentIds(string, string) view returns (uint256)",
  
  // Transaction functions
  "function registerVoter(address voter)",
  "function registerVotersBatch(address[] voters)",
  "function createElection(uint8 electionType, uint256 startTime, uint256 endTime) returns (uint256)",
  "function updateElectionStatus(uint256 electionId, uint8 status)",
  "function autoUpdateElectionStatus(uint256 electionId)",
  "function finalizeResults(uint256 electionId)",
  "function registerCandidate(string studentId) returns (uint256)",
  "function addCandidateToElection(uint256 electionId, uint256 candidateId)",
  "function createTicket(string presidentStudentId, string vpStudentId) returns (uint256)",
  "function addTicketToElection(uint256 electionId, uint256 ticketId)",
  "function voteForSenator(uint256 electionId, uint256 candidateId, uint256 nonce) returns (bool)",
  "function voteForPresidentVP(uint256 electionId, uint256 ticketId, uint256 nonce) returns (bool)"
];

// Constants
// No direct RPC connections to prevent CSP violations - using MetaMask provider only
const CONTRACT_ADDRESS = import.meta.env.VITE_NEW_CONTRACT_ADDRESS || '0x903389c84cDd36beC37373300cF7546dbB9d4Ee2';

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
  electionType: ElectionType;
  status: ElectionStatus;
  startTime: number;
  endTime: number;
  totalVotesCast: number;
  resultsFinalized: boolean;
}

export interface Candidate {
  id: number;
  studentId: string;
  voteCount: number;
}

export interface Ticket {
  id: number;
  presidentStudentId: string;
  vpStudentId: string;
  voteCount: number;
}

class StudentIdWeb3Service {
  private provider: ethers.BrowserProvider | null = null;
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

      console.log('Using MetaMask provider only approach - no RPC URLs');
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize StudentIdWeb3Service:', error);
      return false;
    }
  }
  
  // Helper to ensure the service is initialized
  async initializeIfNeeded(): Promise<boolean> {
    // If already initialized, return success
    if (this.isInitialized && this.contract && this.signer) {
      return true;
    }
    
    // If not initialized, try to initialize
    console.log('Service not fully initialized, initializing on demand...');
    
    try {
      // Connect to MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use blockchain features.');
      }
      
      console.log('Connecting to MetaMask...');
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethersProvider.getSigner();
      this.signer = signer;
      this.walletAddress = await signer.getAddress();
      
      console.log('Connected to wallet:', this.walletAddress);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        IMPROVED_STUDENT_ID_CONTRACT_ABI,
        signer
      );
      
      console.log('Contract initialized on demand');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize on demand:', error);
      return false;
    }
  }

  // Get next nonce for the current user
  async getNextNonce(): Promise<number> {
    try {
      await this.initializeIfNeeded();
      const nonce = await this.contract.getNextNonce();
      return Number(nonce);
    } catch (error) {
      console.error('Failed to get next nonce:', error);
      throw error;
    }
  }

  // Create an election with time bounds
  async createElection(
    electionType: ElectionType,
    startTime: number,
    endTime: number
  ): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Creating election with type: ${electionType}, startTime: ${startTime}, endTime: ${endTime}`);
      
      // Use gas settings for Polygon network
      const options = {
        gasLimit: 2000000,
        maxPriorityFeePerGas: ethers.parseUnits("25.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("60.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.createElection(
        electionType,
        startTime,
        endTime,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Find the ElectionCreated event
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("ElectionCreated(uint256,uint8,uint256,uint256)")
      );
      
      if (event) {
        const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256'],
          event.topics[1]
        );
        return Number(decodedData[0]);
      }
      
      // Fallback
      console.warn('ElectionCreated event not found, using fallback method...');
      return 1;
    } catch (error) {
      console.error('Failed to create election:', error);
      throw error;
    }
  }

  // Register a candidate with student ID
  async registerCandidate(studentId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Registering candidate with student ID: ${studentId}`);
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.registerCandidate(
        studentId,
        options
      );
      
      const receipt = await tx.wait();
      
      // Find the CandidateRegistered event
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("CandidateRegistered(uint256,string)")
      );
      
      if (event) {
        const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256'],
          event.topics[1]
        );
        return Number(decodedData[0]);
      }
      
      // Fallback
      console.warn('CandidateRegistered event not found, using fallback method...');
      return 1;
    } catch (error) {
      console.error(`Failed to register candidate with student ID ${studentId}:`, error);
      throw error;
    }
  }

  // Look up candidate ID by student ID
  async getCandidateIdByStudentId(studentId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Looking up candidate ID for student ID: ${studentId}`);
      
      const candidateId = await this.contract.getCandidateIdByStudentId(studentId);
      return Number(candidateId);
    } catch (error) {
      console.error(`Failed to get candidate ID for student ID ${studentId}:`, error);
      throw error;
    }
  }

  // Create a ticket with president and VP student IDs
  async createTicket(presidentStudentId: string, vpStudentId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Creating ticket with president ID: ${presidentStudentId}, VP ID: ${vpStudentId}`);
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.createTicket(
        presidentStudentId,
        vpStudentId,
        options
      );
      
      const receipt = await tx.wait();
      
      // Find the TicketCreated event
      const event = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id("TicketCreated(uint256,string,string)")
      );
      
      if (event) {
        const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256'],
          event.topics[1]
        );
        return Number(decodedData[0]);
      }
      
      // Fallback
      console.warn('TicketCreated event not found, using fallback method...');
      return 1;
    } catch (error) {
      console.error(`Failed to create ticket:`, error);
      throw error;
    }
  }

  // Look up ticket ID by president and VP student IDs
  async getTicketIdByStudentIds(presidentStudentId: string, vpStudentId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Looking up ticket ID for president: ${presidentStudentId}, VP: ${vpStudentId}`);
      
      const ticketId = await this.contract.getTicketIdByStudentIds(presidentStudentId, vpStudentId);
      return Number(ticketId);
    } catch (error) {
      console.error(`Failed to get ticket ID:`, error);
      throw error;
    }
  }

  // Get candidate vote count
  async getCandidateVoteCount(candidateId: number): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      const voteCount = await this.contract.getCandidateVoteCount(candidateId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for candidate ${candidateId}:`, error);
      return 0;
    }
  }

  // Get ticket vote count
  async getTicketVoteCount(ticketId: number): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      const voteCount = await this.contract.getTicketVoteCount(ticketId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for ticket ${ticketId}:`, error);
      return 0;
    }
  }

  // Get election details
  async getElectionDetails(electionId: number): Promise<Election> {
    try {
      await this.initializeIfNeeded();
      
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
      console.error(`Failed to get details for election ${electionId}:`, error);
      throw error;
    }
  }

  // Get election candidates
  async getElectionCandidates(electionId: number): Promise<number[]> {
    try {
      await this.initializeIfNeeded();
      
      const candidateIds = await this.contract.getElectionCandidates(electionId);
      return candidateIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get candidates for election ${electionId}:`, error);
      return [];
    }
  }

  // Get election tickets
  async getElectionTickets(electionId: number): Promise<number[]> {
    try {
      await this.initializeIfNeeded();
      
      const ticketIds = await this.contract.getElectionTickets(electionId);
      return ticketIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get tickets for election ${electionId}:`, error);
      return [];
    }
  }

  // Vote for a senator
  async voteForSenator(electionId: number, candidateId: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Get next nonce
      const nonce = await this.getNextNonce();
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.voteForSenator(
        electionId,
        candidateId,
        nonce,
        options
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error(`Failed to vote for senator in election ${electionId}:`, error);
      throw error;
    }
  }

  // Vote for a president/VP ticket
  async voteForPresidentVP(electionId: number, ticketId: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Get next nonce
      const nonce = await this.getNextNonce();
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.voteForPresidentVP(
        electionId,
        ticketId,
        nonce,
        options
      );
      
      await tx.wait();
      return true;
    } catch (error) {
      console.error(`Failed to vote for president/VP in election ${electionId}:`, error);
      throw error;
    }
  }

  // Check if a voter has voted in an election
  async checkIfVoted(electionId: number, voterAddress?: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      const address = voterAddress || this.walletAddress;
      if (!address) {
        throw new Error('No wallet address provided');
      }
      
      return await this.contract.checkIfVoted(electionId, address);
    } catch (error) {
      console.error(`Failed to check if address has voted in election ${electionId}:`, error);
      return false;
    }
  }

  // Auto-update an election's status based on time
  async autoUpdateElectionStatus(electionId: number): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.autoUpdateElectionStatus(electionId, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to auto-update status for election ${electionId}:`, error);
      throw error;
    }
  }

  // Helper methods
  isWeb3Initialized(): boolean {
    return this.isInitialized;
  }

  isWalletConnected(): boolean {
    return !!this.walletAddress;
  }

  getWalletAddress(): string {
    return this.walletAddress;
  }

  async connectWallet(): Promise<string> {
    await this.initializeIfNeeded();
    return this.walletAddress;
  }
}

const studentIdWeb3Service = new StudentIdWeb3Service();
export default studentIdWeb3Service;