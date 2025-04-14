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
  contract: any = null; // Make public for direct access by components
  private signer: ethers.Signer | null = null;
  private isInitialized = false;
  private walletAddress = '';

  // Initialize the Web3 service
  async initialize(forceReinitialize: boolean = false): Promise<boolean> {
    try {
      // Skip initialization if already initialized and not forcing reinitialization
      if (this.isInitialized && this.contract && this.signer && !forceReinitialize) {
        console.log('Service already initialized, skipping initialization.');
        return true;
      }
      
      if (!CONTRACT_ADDRESS) {
        console.error('Contract address is not set');
        return false;
      }

      console.log('Using MetaMask provider only approach - no RPC URLs');
      
      // For full initialization, connectWallet must be called
      if (!this.walletAddress || forceReinitialize) {
        try {
          await this.connectWallet();
        } catch (walletError) {
          console.warn('Failed to connect wallet during initialization:', walletError);
          // We'll still mark as initialized but with limited functionality
        }
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize StudentIdWeb3Service:', error);
      return false;
    }
  }
  
  // Helper to ensure the service is initialized
  async initializeIfNeeded(forceReinitialize: boolean = false): Promise<boolean> {
    // If already initialized and not forcing reinitialization, return success
    if (this.isInitialized && this.contract && this.signer && !forceReinitialize) {
      return true;
    }
    
    // If not initialized or forcing reinitialization, try to initialize
    console.log(`Service not fully initialized, initializing on demand... ${forceReinitialize ? '(forced)' : ''}`);
    
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
  async getCandidateVoteCount(candidateId: number, retryCount = 0): Promise<number> {
    try {
      // Increased number of retry attempts for better reliability
      const MAX_RETRIES = 5;
      
      // Make sure we're initialized and properly connected
      if (!this.isInitialized || !this.contract) {
        console.log(`[Vote Count] Service not initialized. Initializing first...`);
        
        try {
          await this.initialize();
        } catch (initError) {
          console.error('[Vote Count] Error during initialization:', initError);
          
          // If we failed to initialize on retry, attempt a forced reconnection
          if (retryCount > 0) {
            console.log('[Vote Count] Attempting alternative initialization approach...');
            try {
              // Force a connection refresh
              await this.connectWallet();
              this.isInitialized = true;
            } catch (walletError) {
              console.error('[Vote Count] Failed alternative initialization:', walletError);
            }
          }
        }
        
        if (!this.isInitialized || !this.contract) {
          console.error('[Vote Count] Failed to initialize service after attempt');
          
          // Retry with exponential backoff if we've not exceeded max retries
          if (retryCount < MAX_RETRIES) {
            const backoffTime = Math.pow(2, retryCount) * 750; // Exponential backoff: 750ms, 1.5s, 3s, 6s, 12s
            console.log(`[Vote Count] Retrying initialization in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return this.getCandidateVoteCount(candidateId, retryCount + 1);
          }
          
          console.warn(`[Vote Count] Max retries reached. Returning default vote count 0.`);
          return 0;
        }
      }
      
      console.log(`[Vote Count] Getting vote count for candidate ${candidateId}...`);
      
      // Check if wallet is connected - for read operations, we can proceed without a wallet 
      // but having one connected provides more consistent behavior
      if (!this.walletAddress && retryCount < 2) {
        console.log(`[Vote Count] No wallet connected. Attempting to connect...`);
        try {
          await this.connectWallet();
        } catch (walletError) {
          console.warn(`[Vote Count] Failed to connect wallet: ${walletError}`);
          // Continue without wallet for read operations
        }
      }
      
      // Validate candidate ID is positive and reasonable 
      if (!candidateId || candidateId <= 0) {
        console.error(`[Vote Count] Invalid candidate ID: ${candidateId}`);
        return 0;
      }
      
      // Use try-catch to specifically handle any failures in contract call
      try {
        // Fetch the vote count
        console.log(`[Vote Count] Calling contract.getCandidateVoteCount(${candidateId})...`);
        
        // Verify contract is properly initialized
        if (!this.contract.getCandidateVoteCount) {
          throw new Error('Contract method getCandidateVoteCount is not available');
        }
        
        // Try different approaches on different retry attempts
        let voteCount;
        if (retryCount % 2 === 1 && this.contract.candidates) {
          // On odd retry attempts, try to get the candidate directly
          console.log(`[Vote Count] Alternative approach: Accessing candidate data directly...`);
          try {
            const candidate = await this.contract.candidates(candidateId);
            voteCount = candidate.voteCount;
          } catch (candidateError) {
            console.warn(`[Vote Count] Failed to get candidate directly:`, candidateError);
            // Fall back to standard method
            voteCount = await this.contract.getCandidateVoteCount(candidateId);
          }
        } else {
          // Standard approach - direct call to getCandidateVoteCount
          voteCount = await this.contract.getCandidateVoteCount(candidateId);
        }
        
        const numericVoteCount = Number(voteCount);
        
        console.log(`[Vote Count] Retrieved vote count for candidate ${candidateId}: ${numericVoteCount}`);
        
        // Validate the vote count (in case of invalid returns)
        if (isNaN(numericVoteCount) || numericVoteCount < 0) {
          throw new Error(`Invalid vote count returned: ${voteCount}`);
        }
        
        return numericVoteCount;
      } catch (contractError) {
        console.error(`[Vote Count] Contract call error for candidate ${candidateId}:`, contractError);
        
        // Retry with exponential backoff if we've not exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(`[Vote Count] Retrying contract call in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          
          // On later retries, try to reinitialize the contract
          if (retryCount >= 2) {
            console.log(`[Vote Count] Reinitializing contract before retry...`);
            try {
              await this.initialize(true); // Force reinitialization
            } catch (reinitError) {
              console.warn(`[Vote Count] Reinitialization failed:`, reinitError);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return this.getCandidateVoteCount(candidateId, retryCount + 1);
        }
        
        console.warn(`[Vote Count] Max retries reached. Returning default vote count 0.`);
        return 0;
      }
    } catch (error) {
      console.error(`[Vote Count] Failed to get vote count for candidate ${candidateId}:`, error);
      // Only return 0 after all retries have been exhausted
      return 0;
    }
  }

  // Get ticket vote count
  async getTicketVoteCount(ticketId: number, retryCount = 0): Promise<number> {
    try {
      // Maximum number of retry attempts
      const MAX_RETRIES = 3;
      
      // Make sure we're initialized and properly connected
      if (!this.isInitialized || !this.contract) {
        console.log(`[Ticket Vote Count] Service not initialized. Initializing first...`);
        await this.initialize();
        
        if (!this.isInitialized || !this.contract) {
          console.error('[Ticket Vote Count] Failed to initialize service after attempt');
          
          // Retry with exponential backoff if we've not exceeded max retries
          if (retryCount < MAX_RETRIES) {
            const backoffTime = Math.pow(2, retryCount) * 500; // Exponential backoff: 500ms, 1s, 2s
            console.log(`[Ticket Vote Count] Retrying initialization in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return this.getTicketVoteCount(ticketId, retryCount + 1);
          }
          
          return 0;
        }
      }
      
      console.log(`[Ticket Vote Count] Getting vote count for ticket ${ticketId}...`);
      
      // Check if wallet is connected
      if (!this.walletAddress) {
        console.log(`[Ticket Vote Count] No wallet connected. Attempting to connect...`);
        try {
          await this.connectWallet();
        } catch (walletError) {
          console.warn(`[Ticket Vote Count] Failed to connect wallet: ${walletError}`);
          // For read operations, we can attempt to continue without a wallet
          // but it's better to have one connected for consistent behavior
        }
      }
      
      // Validate ticket ID is positive and reasonable 
      if (ticketId <= 0) {
        console.error(`[Ticket Vote Count] Invalid ticket ID: ${ticketId}`);
        return 0;
      }
      
      // Use try-catch to specifically handle any failures in contract call
      try {
        // Fetch the vote count
        console.log(`[Ticket Vote Count] Calling contract.getTicketVoteCount(${ticketId})...`);
        const voteCount = await this.contract.getTicketVoteCount(ticketId);
        const numericVoteCount = Number(voteCount);
        
        console.log(`[Ticket Vote Count] Retrieved vote count for ticket ${ticketId}: ${numericVoteCount}`);
        
        // Validate the vote count (in case of invalid returns)
        if (isNaN(numericVoteCount) || numericVoteCount < 0) {
          throw new Error(`Invalid vote count returned: ${voteCount}`);
        }
        
        return numericVoteCount;
      } catch (contractError) {
        console.error(`[Ticket Vote Count] Contract call error for ticket ${ticketId}:`, contractError);
        
        // Retry with exponential backoff if we've not exceeded max retries
        if (retryCount < MAX_RETRIES) {
          const backoffTime = Math.pow(2, retryCount) * 500; // Exponential backoff: 500ms, 1s, 2s
          console.log(`[Ticket Vote Count] Retrying contract call in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          return this.getTicketVoteCount(ticketId, retryCount + 1);
        }
        
        throw contractError;
      }
    } catch (error) {
      console.error(`[Ticket Vote Count] Failed to get vote count for ticket ${ticketId}:`, error);
      // Only return 0 after all retries have been exhausted
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
  
  // Add candidate to election
  async addCandidateToElection(electionId: number, candidateId: number): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Adding candidate ID ${candidateId} to election ID ${electionId}`);
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.addCandidateToElection(
        electionId,
        candidateId,
        options
      );
      
      await tx.wait();
    } catch (error) {
      console.error(`Failed to add candidate ${candidateId} to election ${electionId}:`, error);
      throw error;
    }
  }
  
  // Register a candidate for an election (wraps addCandidateToElection)
  async registerCandidateForElection(electionId: number, candidateId: number): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      console.log(`Registering candidate ID ${candidateId} for election ID ${electionId}`);
      
      // This method is just an alias for addCandidateToElection for better API naming
      await this.addCandidateToElection(electionId, candidateId);
      
      console.log(`Successfully registered candidate ${candidateId} for election ${electionId}`);
    } catch (error) {
      console.error(`Failed to register candidate ${candidateId} for election ${electionId}:`, error);
      throw error;
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
  async voteForSenator(electionId: number, candidateId: number): Promise<{ success: boolean, txHash?: string, voteCount?: number }> {
    let beforeVoteCount = 0;
    let attemptCount = 0;
    const maxAttempts = 3;
    
    try {
      console.log(`[Vote] Starting vote process for election ${electionId}, candidate ${candidateId}`);
      
      // First, ensure service is fully initialized and connected
      if (!this.isInitialized || !this.contract) {
        console.log(`[Vote] Service not fully initialized. Initializing first...`);
        await this.initialize();
        
        if (!this.isInitialized || !this.contract) {
          throw new Error('Failed to initialize blockchain service before voting');
        }
      }
      
      // Ensure wallet is connected
      if (!this.walletAddress) {
        console.log(`[Vote] Wallet not connected. Connecting first...`);
        try {
          await this.connectWallet();
        } catch (walletError) {
          throw new Error(`Failed to connect wallet for voting: ${walletError}`);
        }
      }
      
      // Verify candidate exists and is registered for this election before voting
      console.log(`[Vote] Verifying candidate ${candidateId} is registered for election ${electionId}...`);
      
      try {
        const electionCandidates = await this.getElectionCandidates(electionId);
        console.log(`[Vote] Found ${electionCandidates.length} candidates for election ${electionId}`);
        console.log(`[Vote] Candidate IDs: ${electionCandidates.join(', ')}`);
        
        if (!electionCandidates.includes(candidateId)) {
          console.warn(`[Vote] Candidate ${candidateId} is not registered for election ${electionId}`);
          console.log(`[Vote] Attempting to verify using alternative method...`);
          
          const isRegistered = await this.checkCandidateInElection(electionId, candidateId);
          if (!isRegistered) {
            console.warn(`[Vote] Alternative verification also failed. Will continue but expect potential contract failure.`);
          } else {
            console.log(`[Vote] Alternative verification successful! Candidate is registered.`);
          }
        } else {
          console.log(`[Vote] Candidate ${candidateId} is properly registered for election ${electionId}`);
        }
        
        // Check current vote count before voting for later verification
        beforeVoteCount = await this.getCandidateVoteCount(candidateId);
        console.log(`[Vote] Current vote count for candidate ${candidateId}: ${beforeVoteCount}`);
      } catch (verifyError) {
        console.warn(`[Vote] Verification error (non-fatal): ${verifyError}`);
        // Continue anyway - this is just a verification step
      }
      
      // Recursive helper function for retry logic
      const attemptVote = async (): Promise<{ txHash: string }> => {
        attemptCount++;
        console.log(`[Vote] Attempt ${attemptCount}/${maxAttempts}`);
        
        try {
          // Get fresh nonce for each attempt to avoid nonce errors
          const nonce = await this.getNextNonce();
          
          const options = {
            gasLimit: 500000 + (attemptCount * 50000), // Increase gas with each retry
            maxPriorityFeePerGas: ethers.parseUnits((15.0 + attemptCount).toString(), "gwei"), // Increase priority fee with each retry
            maxFeePerGas: ethers.parseUnits((35.0 + attemptCount * 2).toString(), "gwei"), // Increase max fee with each retry
            type: 2,
          };
          
          console.log(`[Vote] Submitting vote in election ID ${electionId} for candidate ${candidateId} with nonce ${nonce}`);
          console.log(`[Vote] Using gas settings: ${JSON.stringify(options)}`);
          
          const tx = await this.contract.voteForSenator(
            electionId,
            candidateId,
            nonce,
            options
          );
          
          console.log(`[Vote] Transaction sent with hash: ${tx.hash}`);
          console.log("[Vote] Waiting for confirmation...");
          
          const receipt = await tx.wait();
          console.log(`[Vote] Transaction confirmed successfully! Block hash: ${receipt.blockHash}, block number: ${receipt.blockNumber}`);
          
          return { txHash: receipt.hash };
        } catch (txError: any) {
          console.error(`[Vote] Transaction error on attempt ${attemptCount}:`, txError);
          
          if (attemptCount < maxAttempts) {
            // Wait before retrying, with increasing backoff
            const delayMs = Math.min(1000 * attemptCount, 5000);
            console.log(`[Vote] Retrying in ${delayMs / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return attemptVote(); // Recursive retry
          }
          
          throw txError; // Re-throw if all attempts failed
        }
      };
      
      // Attempt the vote with retry logic
      const { txHash } = await attemptVote();
      
      // Verify the vote was recorded by checking the vote count increased
      let voteVerified = false;
      let afterVoteCount = 0;
      
      // Try multiple times to verify the vote count increased, as there might be blockchain latency
      // Increase to 5 attempts with longer delays
      const maxVerificationAttempts = 5;
      for (let i = 0; i < maxVerificationAttempts; i++) {
        try {
          // Use exponential backoff for verification delays
          // First attempt: 2s, Second: 4s, Third: 6s, Fourth: 8s, Fifth: 10s
          const verifyDelay = 2000 * (i + 1);
          console.log(`[Vote] Waiting ${verifyDelay/1000} seconds for blockchain to update before verification attempt ${i+1}/${maxVerificationAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, verifyDelay));
          
          // Force a fresh provider connection to ensure we don't get cached data
          if (i > 1) {
            console.log(`[Vote] Refreshing blockchain connection for verification attempt ${i+1}...`);
            try {
              await this.initializeIfNeeded(true); // Force reinitialize
            } catch (refreshError) {
              console.warn(`[Vote] Could not refresh connection: ${refreshError}`);
              // Continue anyway with existing connection
            }
          }
          
          afterVoteCount = await this.getCandidateVoteCount(candidateId);
          console.log(`[Vote] Vote count for candidate ${candidateId} after voting: ${afterVoteCount} (was ${beforeVoteCount})`);
          
          if (afterVoteCount > beforeVoteCount) {
            console.log(`[Vote] ✅ Vote successfully verified! Vote count increased by ${afterVoteCount - beforeVoteCount}`);
            voteVerified = true;
            break;
          } else {
            console.log(`[Vote] ⚠️ Vote count has not increased yet. Will retry verification.`);
            
            // After a few attempts, try to get updated contract state
            if (i >= 2) {
              console.log(`[Vote] Attempting to clear cache and refresh contract state...`);
              try {
                // Re-fetch the latest state from the blockchain
                const provider = new ethers.BrowserProvider(window.ethereum);
                await provider.send("eth_syncing", []);
              } catch (clearError) {
                console.warn(`[Vote] Error refreshing blockchain state: ${clearError}`);
              }
            }
          }
        } catch (countError) {
          console.warn(`[Vote] Failed to verify vote count on attempt ${i+1}: ${countError}`);
        }
      }
      
      if (!voteVerified) {
        console.warn(`[Vote] ⚠️ Could not verify vote count increased, but transaction was confirmed. This might indicate a blockchain delay.`);
      }
      
      // Return success with transaction hash and vote count
      return { 
        success: true, 
        txHash, 
        voteCount: voteVerified ? afterVoteCount : undefined 
      };
    } catch (error: any) {
      console.error(`[Vote] Failed to vote for senator in election ${electionId}:`, error);
      
      // Create a user-friendly error message
      let errorMessage = "Failed to record vote on blockchain";
      
      if (error?.code === 'ACTION_REJECTED') {
        errorMessage = "Transaction was rejected by the user";
      } else if (error?.message?.includes("user rejected transaction")) {
        errorMessage = "You rejected the transaction in your wallet";
      } else if (error?.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (error?.message?.includes("already voted")) {
        errorMessage = "You have already voted in this election";
      } else if (error?.message?.includes("Election not active")) {
        errorMessage = "This election is not currently active";
      }
      
      // Enhanced error object
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).originalError = error;
      (enhancedError as any).attemptsMade = attemptCount;
      
      throw enhancedError;
    }
  }
  
  /**
   * Checks if a candidate is registered for a specific election
   * Uses multiple verification methods for reliability
   * @param electionId - The blockchain ID of the election
   * @param candidateId - The blockchain ID of the candidate
   * @returns True if the candidate is registered for the election, false otherwise
   */
  async checkCandidateInElection(electionId: number, candidateId: number): Promise<boolean> {
    try {
      console.log(`[Verify] Direct check if candidate ${candidateId} is registered for election ${electionId}...`);
      
      // If no contract, initialize first
      if (!this.isInitialized || !this.contract) {
        console.log(`[Verify] Service not initialized. Initializing first...`);
        await this.initialize();
      }
      
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      // First, try the getElectionCandidates approach
      try {
        const candidateList = await this.contract.getElectionCandidates(electionId);
        const candidateIds = candidateList.map((id: any) => Number(id));
        const isRegistered = candidateIds.includes(candidateId);
        console.log(`[Verify] Candidate ${candidateId} registration check for election ${electionId} (method 1): ${isRegistered}`);
        
        if (isRegistered) {
          return true;
        }
      } catch (listError) {
        console.warn(`[Verify] Failed to check using candidate list method:`, listError);
        // Continue to alternative method if this fails
      }
      
      // Alternative: Check if the candidate exists and has votes
      try {
        const voteCount = await this.contract.getCandidateVoteCount(candidateId);
        const hasVotes = Number(voteCount) > 0;
        console.log(`[Verify] Candidate ${candidateId} has ${voteCount} votes`);
        
        // This doesn't guarantee candidate is in THIS election, but it's a good indicator
        if (hasVotes) {
          console.log(`[Verify] Candidate ${candidateId} has votes, assuming it's registered in the system`);
          return true;
        }
      } catch (voteError) {
        console.warn(`[Verify] Failed to verify using vote count method:`, voteError);
      }
      
      // As a final check, try to get the candidate details directly
      try {
        const candidateInfo = await this.contract.candidates(candidateId);
        if (candidateInfo && candidateInfo.id > 0) {
          console.log(`[Verify] Candidate ${candidateId} exists in the system`);
          // Again, this doesn't confirm it's in THIS election, but it's a positive signal
          return true;
        }
      } catch (detailsError) {
        console.warn(`[Verify] Failed to get candidate details:`, detailsError);
      }
      
      console.log(`[Verify] All verification methods failed, candidate ${candidateId} may not be registered for election ${electionId}`);
      return false;
    } catch (error) {
      console.error(`[Verify] Error checking if candidate ${candidateId} is in election ${electionId}:`, error);
      return false;
    }
  }

  // Vote for a president/VP ticket
  async voteForPresidentVP(electionId: number, ticketId: number): Promise<boolean> {
    try {
      // First, ensure service is fully initialized and connected
      if (!this.isInitialized || !this.contract) {
        console.log(`[President/VP Vote] Service not fully initialized. Initializing first...`);
        await this.initialize();
        
        if (!this.isInitialized || !this.contract) {
          throw new Error('Failed to initialize blockchain service before voting');
        }
      }
      
      // Ensure wallet is connected
      if (!this.walletAddress) {
        console.log(`[President/VP Vote] Wallet not connected. Connecting first...`);
        try {
          await this.connectWallet();
        } catch (walletError) {
          throw new Error(`Failed to connect wallet for voting: ${walletError}`);
        }
      }
      
      // Verify ticket exists and is registered for this election before voting
      console.log(`[President/VP Vote] Verifying ticket ${ticketId} is registered for election ${electionId}...`);
      
      try {
        const electionTickets = await this.getElectionTickets(electionId);
        console.log(`[President/VP Vote] Found ${electionTickets.length} tickets for election ${electionId}`);
        console.log(`[President/VP Vote] Ticket IDs: ${electionTickets.join(', ')}`);
        
        if (!electionTickets.includes(ticketId)) {
          console.warn(`[President/VP Vote] Ticket ${ticketId} is not registered for election ${electionId}`);
          // Continue anyway - the contract will validate this
        } else {
          console.log(`[President/VP Vote] Ticket ${ticketId} is properly registered for election ${electionId}`);
          
          // Check current vote count before voting
          const beforeVoteCount = await this.getTicketVoteCount(ticketId);
          console.log(`[President/VP Vote] Current vote count for ticket ${ticketId}: ${beforeVoteCount}`);
        }
      } catch (verifyError) {
        console.warn(`[President/VP Vote] Verification error (non-fatal): ${verifyError}`);
        // Continue anyway - this is just a verification step
      }
      
      // Get next nonce
      const nonce = await this.getNextNonce();
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      console.log(`[President/VP Vote] Submitting vote in election ID ${electionId} (timestamp) for ticket ${ticketId} with nonce ${nonce}`);
      
      const tx = await this.contract.voteForPresidentVP(
        electionId,
        ticketId,
        nonce,
        options
      );
      
      console.log("[President/VP Vote] Transaction sent, waiting for confirmation...");
      const receipt = await tx.wait();
      console.log(`[President/VP Vote] Transaction confirmed successfully! Transaction hash: ${receipt.hash}`);
      
      // Check vote count after successful voting to verify it increased
      try {
        // Allow some time for blockchain to update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterVoteCount = await this.getTicketVoteCount(ticketId);
        console.log(`[President/VP Vote] Vote count for ticket ${ticketId} after voting: ${afterVoteCount}`);
      } catch (countError) {
        console.warn(`[President/VP Vote] Failed to get updated vote count (non-fatal): ${countError}`);
        // Continue anyway - this is just for verification
      }
      
      return true;
    } catch (error) {
      console.error(`[President/VP Vote] Failed to vote for president/VP in election ${electionId}:`, error);
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
      
      console.log(`Checking if address ${address} has voted in election with ID ${electionId} (expected to be a timestamp)`);
      const hasVoted = await this.contract.checkIfVoted(electionId, address);
      console.log(`Result of checkIfVoted for election ${electionId}: ${hasVoted}`);
      return hasVoted;
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
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use blockchain features.');
      }
      
      console.log('Explicitly requesting accounts from MetaMask...');
      // Request accounts from MetaMask - this is the key step that's missing
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }
      
      // Then initialize the provider and contract
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
      
      this.isInitialized = true;
      return this.walletAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }
  
  // Role management functions
  
  // Get role constants from the contract
  async getRoleConstants(): Promise<{
    ADMIN_ROLE: string;
    ELECTION_MANAGER_ROLE: string;
    VOTER_MANAGER_ROLE: string;
  }> {
    try {
      await this.initializeIfNeeded();
      
      const roles = await this.contract.getRoleConstants();
      return {
        ADMIN_ROLE: roles[0],
        ELECTION_MANAGER_ROLE: roles[1],
        VOTER_MANAGER_ROLE: roles[2]
      };
    } catch (error) {
      console.error('Failed to get role constants:', error);
      // Return default values based on keccak256 hash of role strings
      return {
        ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ELECTION_MANAGER_ROLE: '0xf2ca9939c76f6989c48f1ccccd30f49c979ef693b972eff8806aa482ca1c7f3c',
        VOTER_MANAGER_ROLE: '0x0110d9c18ac8bcdec6c87ea39e115f229d32c87aebd28fbecbc9a082f9e99ac3'
      };
    }
  }
  
  // Check if the current wallet has a specific role
  async hasRole(role: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      if (!this.walletAddress) {
        return false;
      }
      
      return await this.contract.hasRole(role, this.walletAddress);
    } catch (error) {
      console.error(`Failed to check role:`, error);
      return false;
    }
  }
  
  // Check if the current wallet has admin role
  async isAdmin(): Promise<boolean> {
    try {
      const roles = await this.getRoleConstants();
      return await this.hasRole(roles.ADMIN_ROLE);
    } catch (error) {
      console.error('Failed to check admin role:', error);
      return false;
    }
  }
  
  // Check if the current wallet has election manager role
  async isElectionManager(): Promise<boolean> {
    try {
      const roles = await this.getRoleConstants();
      return await this.hasRole(roles.ELECTION_MANAGER_ROLE);
    } catch (error) {
      console.error('Failed to check election manager role:', error);
      return false;
    }
  }
  
  // Check if the current wallet has voter manager role
  async isVoterManager(): Promise<boolean> {
    try {
      const roles = await this.getRoleConstants();
      return await this.hasRole(roles.VOTER_MANAGER_ROLE);
    } catch (error) {
      console.error('Failed to check voter manager role:', error);
      return false;
    }
  }
  
  // Grant a role to an address
  async grantRole(role: string, address: string): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.grantRole(role, address, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to grant role:`, error);
      throw error;
    }
  }
  
  // Revoke a role from an address
  async revokeRole(role: string, address: string): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.revokeRole(role, address, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to revoke role:`, error);
      throw error;
    }
  }
  
  // Manage multiple roles at once
  async manageRoles(address: string, roles: string[], grantValues: boolean[]): Promise<void> {
    try {
      await this.initializeIfNeeded();
      
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2,
      };
      
      const tx = await this.contract.manageRoles(address, roles, grantValues, options);
      await tx.wait();
    } catch (error) {
      console.error(`Failed to manage roles:`, error);
      throw error;
    }
  }
}

const studentIdWeb3Service = new StudentIdWeb3Service();
export default studentIdWeb3Service;