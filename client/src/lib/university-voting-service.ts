import { ethers } from 'ethers';

// ABI for the UniversityVoting contract - explicitly defined since we can't import directly from the JSON file
const universityVotingABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "ElectionCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "studentId", "type": "string" }
    ],
    "name": "CandidateAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "presidentId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "vpId", "type": "string" }
    ],
    "name": "TicketAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "voter", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "voter", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "VoteRejected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint8", "name": "adminSlot", "type": "uint8" },
      { "indexed": false, "internalType": "address", "name": "admin", "type": "address" }
    ],
    "name": "AdminAssigned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "winnerId", "type": "string" }
    ],
    "name": "ElectionFinalized",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_admin", "type": "address" }],
    "name": "setAdmin1",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_admin", "type": "address" }],
    "name": "setAdmin2",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "createElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "studentId", "type": "string" }
    ],
    "name": "addCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "presidentId", "type": "string" },
      { "internalType": "string", "name": "vpId", "type": "string" }
    ],
    "name": "addTicket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "startTime", "type": "uint256" }],
    "name": "updateElectionStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "studentId", "type": "string" },
      { "internalType": "uint256", "name": "nonce", "type": "uint256" }
    ],
    "name": "voteForCandidate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "presidentId", "type": "string" },
      { "internalType": "string", "name": "vpId", "type": "string" },
      { "internalType": "uint256", "name": "nonce", "type": "uint256" }
    ],
    "name": "voteForTicket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "bool", "name": "isTicketBased", "type": "bool" }
    ],
    "name": "finalizeResults",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "startTime", "type": "uint256" }],
    "name": "getWinnerCandidate",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "startTime", "type": "uint256" }],
    "name": "getWinnerTicket",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "studentId", "type": "string" }
    ],
    "name": "getCandidateVotes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "string", "name": "presidentId", "type": "string" },
      { "internalType": "string", "name": "vpId", "type": "string" }
    ],
    "name": "getTicketVotes",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "hasUserVoted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAdmins",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// UniversityVoting contract address on Polygon Amoy testnet
const CONTRACT_ADDRESS = import.meta.env.VITE_UNIVERSITY_VOTING_CONTRACT_ADDRESS || '0x64c0f44Adf0a88760DAD24747653e640551b893b';

// This class provides methods to interact with the UniversityVoting contract
class UniversityVotingService {
  private provider: ethers.BrowserProvider | null = null;
  private contract: any = null;
  private signer: ethers.Signer | null = null;
  private isInitialized = false;
  private walletAddress = '';

  // Initialize the service
  async initialize(): Promise<boolean> {
    try {
      if (!CONTRACT_ADDRESS) {
        console.error('University Voting contract address is not set');
        return false;
      }

      // Use only MetaMask's provider to avoid CSP issues
      console.log('Initializing UniversityVotingService using MetaMask provider');
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize UniversityVotingService:', error);
      return false;
    }
  }
  
  // Helper to ensure the service is initialized
  async initializeIfNeeded(): Promise<boolean> {
    // If already initialized and connected, return success
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
      this.provider = ethersProvider;
      const signer = await ethersProvider.getSigner();
      this.signer = signer;
      this.walletAddress = await signer.getAddress();
      
      console.log('Connected to wallet:', this.walletAddress);
      
      // Initialize contract
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        universityVotingABI,
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

  // Get wallet connection status
  isWalletConnected(): boolean {
    return !!this.walletAddress;
  }

  // Get connected wallet address
  getWalletAddress(): string {
    return this.walletAddress;
  }

  // Connect wallet explicitly
  async connectWallet(): Promise<string> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Re-initialize to get the signer
      await this.initializeIfNeeded();
      
      return this.walletAddress;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Create an election on the blockchain using startTime and endTime timestamps
  async createElection(startTime: number, endTime: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Creating election with: startTime=${startTime}, endTime=${endTime}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2 // EIP-1559 transaction type
      };
      
      const tx = await this.contract.createElection(
        startTime,
        endTime,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Election created successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to create election:', error);
      throw error;
    }
  }

  // Add a candidate to an election using studentId
  async addCandidate(startTime: number, studentId: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Adding candidate with studentId=${studentId} to election with startTime=${startTime}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.addCandidate(
        startTime,
        studentId,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Candidate added successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to add candidate:', error);
      throw error;
    }
  }

  // Add a president/vp ticket to an election
  async addTicket(startTime: number, presidentId: string, vpId: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Adding ticket with presidentId=${presidentId}, vpId=${vpId} to election with startTime=${startTime}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.addTicket(
        startTime,
        presidentId,
        vpId,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Ticket added successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to add ticket:', error);
      throw error;
    }
  }

  // Vote for a candidate in an election
  async voteForCandidate(startTime: number, studentId: string, nonce: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Voting for candidate with studentId=${studentId} in election with startTime=${startTime}, nonce=${nonce}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.voteForCandidate(
        startTime,
        studentId,
        nonce,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Vote cast successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to vote for candidate:', error);
      throw error;
    }
  }

  // Vote for a ticket in an election
  async voteForTicket(startTime: number, presidentId: string, vpId: string, nonce: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Voting for ticket with presidentId=${presidentId}, vpId=${vpId} in election with startTime=${startTime}, nonce=${nonce}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.voteForTicket(
        startTime,
        presidentId,
        vpId,
        nonce,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Vote cast successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to vote for ticket:', error);
      throw error;
    }
  }

  // Check if a user has voted in an election
  async hasUserVoted(startTime: number, userAddress?: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      // Use the provided address or the connected wallet address
      const address = userAddress || this.walletAddress;
      if (!address) {
        throw new Error('No wallet address available');
      }
      
      return await this.contract.hasUserVoted(startTime, address);
    } catch (error) {
      console.error('Failed to check if user has voted:', error);
      throw error;
    }
  }

  // Get the number of votes for a candidate
  async getCandidateVotes(startTime: number, studentId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const votes = await this.contract.getCandidateVotes(startTime, studentId);
      return Number(votes);
    } catch (error) {
      console.error('Failed to get candidate votes:', error);
      throw error;
    }
  }

  // Get the number of votes for a ticket
  async getTicketVotes(startTime: number, presidentId: string, vpId: string): Promise<number> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const votes = await this.contract.getTicketVotes(startTime, presidentId, vpId);
      return Number(votes);
    } catch (error) {
      console.error('Failed to get ticket votes:', error);
      throw error;
    }
  }

  // Update the status of an election
  async updateElectionStatus(startTime: number): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Updating status for election with startTime=${startTime}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.updateElectionStatus(
        startTime,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Election status updated successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to update election status:', error);
      throw error;
    }
  }

  // Finalize the results of an election
  async finalizeResults(startTime: number, isTicketBased: boolean): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Finalizing results for election with startTime=${startTime}, isTicketBased=${isTicketBased}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 1000000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.finalizeResults(
        startTime,
        isTicketBased,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Election results finalized successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to finalize election results:', error);
      throw error;
    }
  }

  // Get the winner candidate of an election
  async getWinnerCandidate(startTime: number): Promise<string> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      return await this.contract.getWinnerCandidate(startTime);
    } catch (error) {
      console.error('Failed to get winner candidate:', error);
      throw error;
    }
  }

  // Get the winner ticket of an election
  async getWinnerTicket(startTime: number): Promise<string> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      return await this.contract.getWinnerTicket(startTime);
    } catch (error) {
      console.error('Failed to get winner ticket:', error);
      throw error;
    }
  }

  // Get the list of admin addresses
  async getAdmins(): Promise<string[]> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }
      
      const [owner, admin1, admin2] = await this.contract.getAdmins();
      return [owner, admin1, admin2].filter(addr => addr !== ethers.ZeroAddress);
    } catch (error) {
      console.error('Failed to get admins:', error);
      throw error;
    }
  }

  // Set admin1 address
  async setAdmin1(adminAddress: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Setting admin1 to address=${adminAddress}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.setAdmin1(
        adminAddress,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Admin1 set successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to set admin1:', error);
      throw error;
    }
  }

  // Set admin2 address
  async setAdmin2(adminAddress: string): Promise<boolean> {
    try {
      await this.initializeIfNeeded();
      
      // Make sure we have a contract instance and signer
      if (!this.contract || !this.signer) {
        throw new Error('Contract not initialized or wallet not connected');
      }
      
      console.log(`Setting admin2 to address=${adminAddress}`);
      
      // Use optimized gas settings for Polygon Amoy testnet
      const options = {
        gasLimit: 300000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2
      };
      
      const tx = await this.contract.setAdmin2(
        adminAddress,
        options
      );
      
      console.log('Transaction sent, awaiting confirmation...');
      const receipt = await tx.wait();
      console.log('Admin2 set successfully:', receipt);
      
      return true;
    } catch (error) {
      console.error('Failed to set admin2:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const universityVotingService = new UniversityVotingService();
export default universityVotingService;

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}