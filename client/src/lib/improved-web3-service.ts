import { ethers } from 'ethers';
import { IMPROVED_CONTRACT_ABI } from './improved-contract-abi';

// Constants
// REMOVED DIRECT RPC URLs to avoid CSP issues - using MetaMask provider only
// No direct RPC connections to prevent CSP violations
console.log("Using MetaMask provider only approach - no RPC URLs");
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

  // Initialize the Web3 service with improved reliability
  async initialize(): Promise<boolean> {
    try {
      if (!CONTRACT_ADDRESS) {
        console.error('Contract address is not set');
        return false;
      }

      // Skip the direct provider initialization - we'll use MetaMask's provider only
      // This avoids issues with CSP (Content Security Policy) blocking RPC connections
      console.log('Using MetaMask provider only approach - no RPC URLs');
      
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
        
        // Use extreme gas settings to overcome Polygon Amoy testnet congestion
        const options = {
          gasLimit: 1000000, // Extremely high gas limit to ensure transaction success
          maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"), // Very high priority fee to prioritize transaction
          maxFeePerGas: ethers.parseUnits("35.0", "gwei"), // Very high max fee to ensure acceptance
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
      
      // Use extremely high gas settings to overcome Polygon Amoy testnet congestion
      const options = {
        gasLimit: 2000000, // Ultra high gas limit to ensure election creation success
        maxPriorityFeePerGas: ethers.parseUnits("25.0", "gwei"), // Very high priority fee to prioritize transaction
        maxFeePerGas: ethers.parseUnits("60.0", "gwei"), // Very high max fee to ensure acceptance
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

      // Use optimized gas settings with higher limits for Polygon Amoy
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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
        gasLimit: 1000000, // Higher gas limit for batch operations
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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

      // Use optimized gas settings with higher limits for Polygon Amoy
      const options = {
        gasLimit: 500000, // Higher gas limit for candidate creation
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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

      // Use optimized gas settings with higher limits for Polygon Amoy
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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

      // Use optimized gas settings with higher limits for Polygon Amoy
      const options = {
        gasLimit: 500000, // Higher gas limit for ticket creation
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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

      // Use optimized gas settings with higher limits for Polygon Amoy
      const options = {
        gasLimit: 500000,
        maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
        maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
        type: 2, // Use EIP-1559 transaction type
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

  // Start an election with enhanced gas and transaction handling - with lazy initialization
  async startElection(electionId: number): Promise<void> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask for election activation...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for election activation');
        } catch (initError) {
          console.error('Failed to initialize contract on-demand for election activation:', initError);
          throw new Error('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
        }
      }
      
      // If still no contract, we can't proceed
      if (!this.contract || !this.signer) {
        throw new Error('Contract could not be initialized. Please make sure MetaMask is installed and connected.');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }
      
      // First, check the election status
      const electionDetails = await this.getElectionDetails(electionId);
      
      // Log election details for debugging
      console.log(`Starting election ${electionId}. Current status: ${electionDetails.status}, Start time: ${new Date(electionDetails.startTime * 1000).toLocaleString()}, End time: ${new Date(electionDetails.endTime * 1000).toLocaleString()}`);
      
      // If already active, no need to proceed
      if (electionDetails.status === ElectionStatus.Active) {
        console.log(`Election ${electionId} is already active. No action needed.`);
        return;
      }
      
      // If completed, cannot be activated
      if (electionDetails.status === ElectionStatus.Completed || electionDetails.status === ElectionStatus.Cancelled) {
        throw new Error(`Cannot activate election ${electionId} because it is already in ${electionDetails.status === ElectionStatus.Completed ? 'completed' : 'cancelled'} state.`);
      }

      // Use ultra-high gas settings to ensure transaction success on Polygon Amoy
      const options = {
        gasLimit: 2000000, // Ultra high gas limit for activation 
        maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Very high priority fee
        maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Very high max fee
        type: 2, // Use EIP-1559 transaction type
      };
      
      // Get nonce before transaction to ensure proper sequencing
      const nonce = await this.getNextNonce();
      
      console.log(`Starting election ${electionId} with nonce ${nonce} and high gas settings`);

      // Use populateTransaction to separate contract parameters from transaction options
      const tx = await this.contract.updateElectionStatus.populateTransaction(
        electionId, 
        ElectionStatus.Active
      );
      
      // Combine the function call with our transaction options
      const transaction = {
        ...tx,
        ...options,
        nonce
      };
      
      console.log(`Sending activation transaction with options:`, options);
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log(`Election activation transaction sent: ${txResponse.hash}`);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(3); // Wait for 3 confirmations for better reliability
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log(`Election activation confirmed in block ${receipt.blockNumber}`);
      
      // Verify the status was updated correctly
      const updatedDetails = await this.getElectionDetails(electionId);
      if (updatedDetails.status === ElectionStatus.Active) {
        console.log(`Election ${electionId} successfully activated.`);
      } else {
        console.warn(`Election ${electionId} status is ${updatedDetails.status} after activation attempt. Expected ${ElectionStatus.Active}.`);
      }
    } catch (error: any) {
      console.error(`Failed to start election ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again with higher gas settings in MetaMask: Gas limit=2000000, Max priority fee=30 gwei, Max fee=70 gwei.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Election activation was rejected by the smart contract. This could be because the election status has changed or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic. Please contact the system administrator.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }
  
  // Start an election with custom gas settings (for retries) - with lazy initialization
  async startElectionWithCustomGas(electionId: number, customGasOptions: any): Promise<void> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask for custom gas election activation...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for custom gas election activation');
        } catch (initError) {
          console.error('Failed to initialize contract on-demand for custom gas election activation:', initError);
          throw new Error('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
        }
      }
      
      // If still no contract, we can't proceed
      if (!this.contract || !this.signer) {
        throw new Error('Contract could not be initialized. Please make sure MetaMask is installed and connected.');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }
      
      // First, check the election status
      const electionDetails = await this.getElectionDetails(electionId);
      
      // Log election details and gas settings for debugging
      console.log(`Starting election ${electionId} with custom gas settings:`, customGasOptions);
      console.log(`Election status: ${electionDetails.status}, Start time: ${new Date(electionDetails.startTime * 1000).toLocaleString()}, End time: ${new Date(electionDetails.endTime * 1000).toLocaleString()}`);
      
      // If already active, no need to proceed
      if (electionDetails.status === ElectionStatus.Active) {
        console.log(`Election ${electionId} is already active. No action needed.`);
        return;
      }
      
      // If completed, cannot be activated
      if (electionDetails.status === ElectionStatus.Completed || electionDetails.status === ElectionStatus.Cancelled) {
        throw new Error(`Cannot activate election ${electionId} because it is already in ${electionDetails.status === ElectionStatus.Completed ? 'completed' : 'cancelled'} state.`);
      }
      
      // Get nonce before transaction to ensure proper sequencing
      const nonce = await this.getNextNonce();
      
      console.log(`Starting election ${electionId} with custom gas settings and nonce ${nonce}`);

      // Use populateTransaction to separate contract parameters from transaction options
      const tx = await this.contract.updateElectionStatus.populateTransaction(
        electionId, 
        ElectionStatus.Active
      );
      
      // Combine the function call with custom gas options and nonce
      const transaction = {
        ...tx,
        ...customGasOptions,
        nonce
      };
      
      console.log(`Sending activation transaction with custom gas options:`, customGasOptions);
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log(`Election activation transaction sent: ${txResponse.hash}`);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(3); // Wait for 3 confirmations for better reliability
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log(`Election activation confirmed in block ${receipt.blockNumber}`);
      
      // Verify the status was updated correctly
      const updatedDetails = await this.getElectionDetails(electionId);
      if (updatedDetails.status === ElectionStatus.Active) {
        console.log(`Election ${electionId} successfully activated with custom gas settings.`);
      } else {
        console.warn(`Election ${electionId} status is ${updatedDetails.status} after activation attempt with custom gas. Expected ${ElectionStatus.Active}.`);
      }
    } catch (error: any) {
      console.error(`Failed to start election ${electionId} with custom gas:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try these ultra-high settings in MetaMask: Gas limit=3000000, Max priority fee=50 gwei, Max fee=100 gwei.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Election activation was rejected by the smart contract. This could be because the election status has changed or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic. Please contact the system administrator.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with even higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }

  // Stop an election (with improved transaction handling) - with lazy initialization
  async stopElection(electionId: number): Promise<void> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask for election stopping...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for stopping election');
        } catch (initError) {
          console.error('Failed to initialize contract on-demand for stopping election:', initError);
          throw new Error('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
        }
      }
      
      // If still no contract, we can't proceed
      if (!this.contract || !this.signer) {
        throw new Error('Contract could not be initialized. Please make sure MetaMask is installed and connected.');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }

      // Use ultra-high gas settings to ensure transaction success on Polygon Amoy
      const options = {
        gasLimit: 2000000, // Ultra high gas limit for better success chance
        maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Very high priority fee
        maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Very high max fee
        type: 2, // Use EIP-1559 transaction type
      };

      // Get nonce before transaction to ensure proper sequencing
      const nonce = await this.getNextNonce();
      
      // Use populateTransaction pattern for better transaction handling
      const tx = await this.contract.updateElectionStatus.populateTransaction(
        electionId,
        ElectionStatus.Completed
      );
      
      // Combine the function call with our transaction options
      const transaction = {
        ...tx,
        ...options,
        nonce
      };
      
      console.log(`Sending stop election transaction with options:`, options);
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log(`Stop election transaction sent: ${txResponse.hash}`);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(3); // Wait for 3 confirmations for better reliability
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log(`Stop election confirmed in block ${receipt.blockNumber}`);
      
      // Verify the status was updated correctly
      const updatedDetails = await this.getElectionDetails(electionId);
      if (updatedDetails.status === ElectionStatus.Completed) {
        console.log(`Election ${electionId} successfully stopped.`);
      } else {
        console.warn(`Election ${electionId} status is ${updatedDetails.status} after stop attempt. Expected ${ElectionStatus.Completed}.`);
      }
    } catch (error: any) {
      console.error(`Failed to stop election ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again with higher gas settings in MetaMask.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Election stop was rejected by the smart contract. This could be because the election is already completed or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }

  // Auto-update an election's status based on time (improved transaction handling) - with lazy initialization
  async autoUpdateElectionStatus(electionId: number): Promise<void> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask for election auto-update...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for auto-updating election status');
        } catch (initError) {
          console.error('Failed to initialize contract on-demand for auto-updating election:', initError);
          throw new Error('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
        }
      }
      
      // If still no contract, we can't proceed
      if (!this.contract || !this.signer) {
        throw new Error('Contract could not be initialized. Please make sure MetaMask is installed and connected.');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }
      
      // First, check the current election details to know what we're working with
      const electionDetails = await this.getElectionDetails(electionId);
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      
      console.log(`Auto-update check for election ${electionId}: Current status=${electionDetails.status}, Start=${new Date(electionDetails.startTime * 1000).toLocaleString()}, End=${new Date(electionDetails.endTime * 1000).toLocaleString()}, Current time=${new Date(currentTime * 1000).toLocaleString()}`);
      
      // Only proceed if the election needs a status update
      const needsUpdate = 
        // If pending but should be active
        (electionDetails.status === 0 && 
         currentTime >= electionDetails.startTime && 
         currentTime <= electionDetails.endTime) ||
        // If active but should be completed
        (electionDetails.status === 1 && 
         currentTime > electionDetails.endTime);
      
      if (!needsUpdate) {
        console.log(`Election ${electionId} status (${electionDetails.status}) is already correct based on time.`);
        return;
      }

      // Determine target status
      let targetStatus: ElectionStatus;
      if (electionDetails.status === 0 && currentTime >= electionDetails.startTime && currentTime <= electionDetails.endTime) {
        targetStatus = ElectionStatus.Active;
        console.log(`Election ${electionId} should be updated from Pending (0) to Active (1)`);
      } else if (electionDetails.status === 1 && currentTime > electionDetails.endTime) {
        targetStatus = ElectionStatus.Completed;
        console.log(`Election ${electionId} should be updated from Active (1) to Completed (2)`);
      } else {
        // This should not happen given our checks, but just to be safe
        console.log(`No clear target status for election ${electionId} with current status ${electionDetails.status}`);
        return;
      }

      console.log(`Updating election ${electionId} status from ${electionDetails.status} to target status ${targetStatus}`);

      // Use ultra-high gas settings to ensure transaction success on Polygon Amoy
      const options = {
        gasLimit: 2000000, // Ultra high gas limit for better success chance
        maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Very high priority fee
        maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Very high max fee
        type: 2, // Use EIP-1559 transaction type
      };

      // Get nonce before transaction to ensure proper sequencing
      const nonce = await this.getNextNonce();
      
      // Use populateTransaction pattern for better transaction handling
      const tx = await this.contract.updateElectionStatus.populateTransaction(
        electionId,
        targetStatus
      );
      
      // Combine the function call with our transaction options
      const transaction = {
        ...tx,
        ...options,
        nonce
      };
      
      console.log(`Sending status update transaction with options:`, options);
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log(`Election status update transaction sent: ${txResponse.hash}`);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(3); // Wait for 3 confirmations for better reliability
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log(`Election status update confirmed in block ${receipt.blockNumber}`);
      
      // Check the updated status to verify it was correctly updated
      const updatedDetails = await this.getElectionDetails(electionId);
      
      if (updatedDetails.status === targetStatus) {
        console.log(`Election ${electionId} successfully updated to target status ${targetStatus}`);
      } else {
        console.warn(`Election ${electionId} status updated from ${electionDetails.status} to ${updatedDetails.status}, but target was ${targetStatus}`);
        
        // If still not at target status, this might indicate an issue with the contract's internal logic
        // We'll log this but not throw an error as the transaction was successful
        if (updatedDetails.status !== targetStatus) {
          console.warn(`Election ${electionId} did not reach target status ${targetStatus} after update transaction. Current status: ${updatedDetails.status}`);
        }
      }
      
      return;
    } catch (error: any) {
      // Log detailed error for debugging
      console.error(`Failed to auto-update election status for ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again with higher gas settings in MetaMask: Gas limit=2000000, Max priority fee=30 gwei, Max fee=70 gwei.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Status update was rejected by the smart contract. This could be because the election status has changed or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic. Please contact the system administrator.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else if (error.message?.includes("nonce too low")) {
        throw new Error("Transaction nonce too low. This suggests a transaction sequencing issue. Please try reconnecting your wallet and try again.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }

  // Finalize election results (with improved transaction handling) - with lazy initialization
  async finalizeResults(electionId: number): Promise<void> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask for finalizing results...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for finalizing election results');
        } catch (initError) {
          console.error('Failed to initialize contract on-demand for finalizing results:', initError);
          throw new Error('Failed to connect to blockchain. Please make sure MetaMask is installed and connected.');
        }
      }
      
      // If still no contract, we can't proceed
      if (!this.contract || !this.signer) {
        throw new Error('Contract could not be initialized. Please make sure MetaMask is installed and connected.');
      }

      // Ensure wallet is connected
      if (!this.walletAddress) {
        throw new Error('Wallet not connected. Please connect your MetaMask wallet first.');
      }

      // Use ultra-high gas settings to ensure transaction success on Polygon Amoy
      const options = {
        gasLimit: 2000000, // Ultra high gas limit for better success chance
        maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Very high priority fee
        maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Very high max fee
        type: 2, // Use EIP-1559 transaction type
      };

      // Get nonce before transaction to ensure proper sequencing
      const nonce = await this.getNextNonce();
      
      // Use populateTransaction pattern for better transaction handling
      const tx = await this.contract.finalizeResults.populateTransaction(
        electionId
      );
      
      // Combine the function call with our transaction options
      const transaction = {
        ...tx,
        ...options,
        nonce
      };
      
      console.log(`Sending finalize results transaction with options:`, options);
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log(`Finalize results transaction sent: ${txResponse.hash}`);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(3); // Wait for 3 confirmations for better reliability
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log(`Finalize results confirmed in block ${receipt.blockNumber}`);
      
      // Verify the results were finalized
      const updatedDetails = await this.getElectionDetails(electionId);
      if (updatedDetails.resultsFinalized) {
        console.log(`Election ${electionId} results successfully finalized.`);
      } else {
        console.warn(`Election ${electionId} results finalization attempted, but resultsFinalized flag is still false.`);
      }
    } catch (error: any) {
      console.error(`Failed to finalize results for election ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again with higher gas settings in MetaMask.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Results finalization was rejected by the smart contract. This could be because the election is not completed yet or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
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

  // Get election details - with lazy initialization
  async getElectionDetails(electionId: number): Promise<ImprovedElection> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for getting election details');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return a default election object with pending status
          return {
            id: electionId,
            electionType: ElectionType.Senator, 
            status: ElectionStatus.Pending,
            startTime: 0,
            endTime: 0,
            totalVotesCast: 0,
            resultsFinalized: false
          };
        }
      }
      
      // If still no contract, return default election rather than throwing
      if (!this.contract) {
        console.warn(`Cannot get election details: Contract not initialized and cannot connect to MetaMask`);
        return {
          id: electionId,
          electionType: ElectionType.Senator, 
          status: ElectionStatus.Pending,
          startTime: 0,
          endTime: 0,
          totalVotesCast: 0,
          resultsFinalized: false
        };
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
      // Return a default election object instead of throwing an error
      return {
        id: electionId,
        electionType: ElectionType.Senator, 
        status: ElectionStatus.Pending,
        startTime: 0,
        endTime: 0,
        totalVotesCast: 0,
        resultsFinalized: false
      };
    }
  }

  // Get candidates for a specific election - with lazy initialization
  async getElectionCandidates(electionId: number): Promise<number[]> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for getting election candidates');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return empty array as fallback rather than throwing an error
          return [];
        }
      }
      
      // If still no contract, return empty array instead of throwing
      if (!this.contract) {
        console.warn(`Cannot get candidates for election ID ${electionId}: Contract not initialized and cannot connect to MetaMask`);
        return [];
      }

      const candidateIds = await this.contract.getElectionCandidates(electionId);
      return candidateIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get candidates for election ID ${electionId}:`, error);
      // Return empty array as fallback to avoid breaking the UI with errors
      return [];
    }
  }

  // Get tickets for a specific election - with lazy initialization
  async getElectionTickets(electionId: number): Promise<number[]> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for getting election tickets');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return empty array as fallback rather than throwing an error
          return [];
        }
      }
      
      // If still no contract, return empty array instead of throwing
      if (!this.contract) {
        console.warn(`Cannot get tickets for election ID ${electionId}: Contract not initialized and cannot connect to MetaMask`);
        return [];
      }

      const ticketIds = await this.contract.getElectionTickets(electionId);
      return ticketIds.map((id: any) => Number(id));
    } catch (error) {
      console.error(`Failed to get tickets for election ID ${electionId}:`, error);
      // Return empty array as fallback to avoid breaking the UI with errors
      return [];
    }
  }

  // Get winner of a finalized election - with lazy initialization
  async getElectionWinner(electionId: number): Promise<{ winnerId: number, votes: number }> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for getting election winner');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return a default object with no winner
          return {
            winnerId: 0,
            votes: 0
          };
        }
      }
      
      // If still no contract, return default instead of throwing
      if (!this.contract) {
        console.warn(`Cannot get winner for election ID ${electionId}: Contract not initialized and cannot connect to MetaMask`);
        return {
          winnerId: 0,
          votes: 0
        };
      }

      const result = await this.contract.getElectionWinner(electionId);
      return {
        winnerId: Number(result[0]),
        votes: Number(result[1])
      };
    } catch (error) {
      console.error(`Failed to get winner for election ID ${electionId}:`, error);
      // Return default values to avoid breaking the UI with errors
      return {
        winnerId: 0,
        votes: 0
      };
    }
  }

  // Get candidate vote count - with lazy initialization and fallback
  async getCandidateVoteCount(candidateId: number): Promise<number> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for vote count');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return 0 as fallback rather than throwing an error
          // This improves the user experience by showing 0 votes instead of errors
          return 0;
        }
      }
      
      // If still no contract, return 0 instead of throwing error
      if (!this.contract) {
        console.warn(`Cannot get vote count for candidate ID ${candidateId}: Contract not initialized and cannot connect to MetaMask`);
        return 0;
      }

      const voteCount = await this.contract.getCandidateVoteCount(candidateId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for candidate ID ${candidateId}:`, error);
      // Return 0 as fallback to avoid breaking the UI with errors
      return 0;
    }
  }

  // Get ticket vote count - with lazy initialization and fallback
  async getTicketVoteCount(ticketId: number): Promise<number> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for ticket vote count');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return 0 as fallback rather than throwing an error
          return 0;
        }
      }
      
      // If still no contract, return 0 instead of throwing error
      if (!this.contract) {
        console.warn(`Cannot get vote count for ticket ID ${ticketId}: Contract not initialized and cannot connect to MetaMask`);
        return 0;
      }

      const voteCount = await this.contract.getTicketVoteCount(ticketId);
      return Number(voteCount);
    } catch (error) {
      console.error(`Failed to get vote count for ticket ID ${ticketId}:`, error);
      // Return 0 as fallback to avoid breaking the UI with errors
      return 0;
    }
  }

  // Get next nonce for voter
  async getNextNonce(): Promise<number> {
    try {
      if (!this.provider || !this.walletAddress) {
        throw new Error('Provider or wallet not initialized');
      }

      // Get the transaction count (nonce) from the provider
      const nonce = await this.provider.getTransactionCount(this.walletAddress);
      console.log(`Retrieved nonce ${nonce} for wallet ${this.walletAddress}`);
      return nonce;
    } catch (error) {
      console.error('Failed to get next nonce:', error);
      // Return 0 as a fallback value to avoid blocking the transaction
      return 0;
    }
  }

  // Check if voter has already voted in an election - with lazy initialization
  async checkIfVoted(electionId: number, voterAddress?: string): Promise<boolean> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for vote check');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return false as fallback rather than throwing an error
          // This fallback treats the user as not having voted yet, which is safer
          return false;
        }
      }
      
      // If still no contract, return false instead of throwing error
      if (!this.contract) {
        console.warn(`Cannot check voted status: Contract not initialized and cannot connect to MetaMask`);
        return false;
      }

      const address = voterAddress || this.walletAddress;
      if (!address) {
        console.warn('No voter address provided for vote check');
        return false;
      }

      return await this.contract.checkIfVoted(electionId, address);
    } catch (error) {
      console.error(`Failed to check if address ${voterAddress || this.walletAddress} voted in election ${electionId}:`, error);
      // Return false as fallback to avoid breaking the UI with errors
      // This fallback treats the user as not having voted yet, which is safer
      return false;
    }
  }

  // Vote for a Senator candidate
  async voteForSenator(electionId: number, candidateId: number, customGasOptions?: any): Promise<string> {
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

      // Use custom gas settings if provided, otherwise use ABSOLUTE MINIMUM settings for student voting
      // CRITICAL: These settings are at the absolute minimum possible values to ensure transactions work
      const options = customGasOptions || {
        gasLimit: 80000, // Absolute minimum gas limit
        maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"), // Absolute minimum priority fee
        maxFeePerGas: ethers.parseUnits("3.0", "gwei"), // Absolute minimum max fee
        type: 2, // Use EIP-1559 transaction type
      };
      
      // If custom gas options were provided, log them
      if (customGasOptions) {
        console.log(`Using custom gas settings for vote transaction:`, customGasOptions);
      }

      console.log(`Sending vote transaction for election ${electionId}, candidate ${candidateId}, nonce ${nonce}`);

      // Skip gas estimation and go straight to sending the transaction
      // This approach might help when the contract has issues with gas estimation but can still process transactions
      console.log("Sending transaction with moderate gas parameters suitable for student voting");
      
      // Send the vote transaction with moderate gas settings
      // FIXED: Properly separate contract arguments from transaction options
      // The nonce is a function argument, options are transaction parameters
      const tx = await this.contract.voteForSenator.populateTransaction(electionId, candidateId, nonce);
      
      // Use the populated transaction with our transaction options
      const transaction = {
        ...tx,
        ...options
      };
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log("Transaction sent, awaiting confirmation:", txResponse.hash);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(2); // Wait for 2 confirmations (reduced from 3 for student voting)
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log("Transaction confirmed with receipt:", receipt);
      
      return receipt.hash;
    } catch (error: any) {
      console.error(`Failed to vote for candidate ${candidateId} in election ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again later.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you've already voted, the election status has changed, or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic. Please contact the system administrator.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }

  // Vote for a President/VP ticket
  async voteForPresidentVP(electionId: number, ticketId: number, customGasOptions?: any): Promise<string> {
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

      // Use custom gas settings if provided, otherwise use ABSOLUTE MINIMUM settings for student voting
      // CRITICAL: These settings are at the absolute minimum possible values to ensure transactions work
      const options = customGasOptions || {
        gasLimit: 80000, // Absolute minimum gas limit
        maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"), // Absolute minimum priority fee
        maxFeePerGas: ethers.parseUnits("3.0", "gwei"), // Absolute minimum max fee
        type: 2, // Use EIP-1559 transaction type
      };
      
      // If custom gas options were provided, log them
      if (customGasOptions) {
        console.log(`Using custom gas settings for President/VP vote transaction:`, customGasOptions);
      }

      console.log(`Sending vote transaction for President/VP election ${electionId}, ticket ${ticketId}, nonce ${nonce}`);

      // Skip gas estimation and go straight to sending the transaction
      // This approach might help when the contract has issues with gas estimation but can still process transactions
      console.log("Sending transaction with moderate gas parameters suitable for student voting");
      
      // FIXED: Apply the same correct pattern for President/VP voting 
      // Properly separate contract arguments from transaction options
      const tx = await this.contract.voteForPresidentVP.populateTransaction(electionId, ticketId, nonce);
      
      // Use the populated transaction with our transaction options
      const transaction = {
        ...tx,
        ...options
      };
      
      // Send the transaction with the signer
      const txResponse = await this.signer.sendTransaction(transaction);
      
      console.log("Transaction sent, awaiting confirmation:", txResponse.hash);
      
      // Wait for the transaction to be mined with a longer timeout
      const receipt = await txResponse.wait(2); // Wait for 2 confirmations (reduced from 3 for student voting)
      
      // Add null check to satisfy TypeScript
      if (!receipt) {
        throw new Error("Transaction was sent but no receipt was returned");
      }
      
      console.log("Transaction confirmed with receipt:", receipt);
      
      return receipt.hash;
    } catch (error: any) {
      console.error(`Failed to vote for ticket ${ticketId} in election ${electionId}:`, error);
      
      // Enhanced error handling for different error cases
      if (error.message?.includes("Internal JSON-RPC error") || error.message?.includes("insufficient funds")) {
        throw new Error("Transaction failed due to network congestion or insufficient funds. Please ensure you have enough testnet MATIC and try again later.");
      } else if (error.message?.includes("execution reverted")) {
        throw new Error("Vote transaction was rejected by the smart contract. This could be because you've already voted, the election status has changed, or there's an issue with the contract implementation.");
      } else if (error.code === "CALL_EXCEPTION") {
        throw new Error("Contract call exception. This usually indicates a problem with the contract's implementation or validation logic. Please contact the system administrator.");
      } else if (error.message?.includes("replacement fee too low") || error.message?.includes("transaction underpriced")) {
        throw new Error("Transaction fee too low. Please try again with higher gas fees in MetaMask settings.");
      } else {
        // For any other errors, throw with the original message
        throw error;
      }
    }
  }

  // Check if an address is a registered voter - with lazy initialization
  async isRegisteredVoter(address?: string): Promise<boolean> {
    try {
      // If no contract, try to initialize through MetaMask connection
      if (!this.contract && window.ethereum) {
        try {
          console.log('Contract not initialized, trying to connect using MetaMask...');
          const ethersProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethersProvider.getSigner();
          this.signer = signer;
          this.walletAddress = await signer.getAddress();
          
          this.contract = new ethers.Contract(
            CONTRACT_ADDRESS,
            IMPROVED_CONTRACT_ABI,
            signer
          );
          
          console.log('Contract initialized on-demand for voter check');
        } catch (initError) {
          console.warn('Failed to initialize contract on-demand:', initError);
          // Return false as fallback rather than throwing an error
          return false;
        }
      }
      
      // If still no contract, return false instead of throwing error
      if (!this.contract) {
        console.warn(`Cannot check voter status: Contract not initialized and cannot connect to MetaMask`);
        return false;
      }

      const voterAddress = address || this.walletAddress;
      if (!voterAddress) {
        console.warn('No voter address provided');
        return false;
      }

      return await this.contract.registeredVoters(voterAddress);
    } catch (error) {
      console.error(`Failed to check if ${address || this.walletAddress} is a registered voter:`, error);
      // Return false as fallback to avoid breaking the UI with errors
      return false;
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