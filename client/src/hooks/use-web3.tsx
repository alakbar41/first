import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import web3Service, { Election, Candidate, PresidentVPTicket, ElectionType, ElectionStatus } from '@/lib/web3Service';

// Define the context type
type Web3ContextType = {
  isInitialized: boolean;
  isWalletConnected: boolean;
  walletAddress: string;
  connectWallet: () => Promise<string>;
  getElectionDetails: (electionId: number) => Promise<Election>;
  getElectionCandidates: (electionId: number) => Promise<number[]>;
  getElectionTickets: (electionId: number) => Promise<number[]>;
  getCandidateDetails: (candidateId: number) => Promise<Candidate>;
  getCandidateVoteCount: (candidateId: number) => Promise<number>;
  getTicketDetails: (ticketId: number) => Promise<PresidentVPTicket>;
  getTicketVoteCount: (ticketId: number) => Promise<number>;
  checkIfVoted: (electionId: number) => Promise<boolean>;
  voteForSenator: (electionId: number, candidateId: number) => Promise<string>;
  voteForPresidentVP: (electionId: number, ticketId: number) => Promise<string>;
};

// Create the context
const Web3Context = createContext<Web3ContextType | null>(null);

// Provider component
export function Web3Provider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Initialize Web3 service
  useEffect(() => {
    const initWeb3 = async () => {
      try {
        const success = await web3Service.initialize();
        setIsInitialized(success);
        
        if (!success) {
          toast({
            title: "Web3 Initialization Failed",
            description: "Unable to connect to blockchain network. Some features may not work properly.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to initialize Web3:', error);
        toast({
          title: "Web3 Initialization Error",
          description: "An error occurred while connecting to the blockchain network.",
          variant: "destructive",
        });
      }
    };

    initWeb3();
  }, [toast]);

  // Check for existing wallet connection
  useEffect(() => {
    const checkConnection = async () => {
      const address = web3Service.getWalletAddress();
      if (address) {
        setWalletAddress(address);
        setIsWalletConnected(true);
      }
    };

    if (isInitialized) {
      checkConnection();
    }
  }, [isInitialized]);

  // Connect wallet function
  const connectWallet = async (): Promise<string> => {
    try {
      const address = await web3Service.connectWallet();
      setWalletAddress(address);
      setIsWalletConnected(true);
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        variant: "default",
      });
      
      return address;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      toast({
        title: "Wallet Connection Failed",
        description: error.message || "Unable to connect wallet. Please make sure MetaMask is installed and unlocked.",
        variant: "destructive",
      });
      
      throw error;
    }
  };

  // Get election details
  const getElectionDetails = async (electionId: number): Promise<Election> => {
    try {
      return await web3Service.getElectionDetails(electionId);
    } catch (error: any) {
      toast({
        title: "Error Fetching Election",
        description: error.message || "Failed to get election details from blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get election candidates
  const getElectionCandidates = async (electionId: number): Promise<number[]> => {
    try {
      return await web3Service.getElectionCandidates(electionId);
    } catch (error: any) {
      toast({
        title: "Error Fetching Candidates",
        description: error.message || "Failed to get election candidates from blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get election tickets
  const getElectionTickets = async (electionId: number): Promise<number[]> => {
    try {
      return await web3Service.getElectionTickets(electionId);
    } catch (error: any) {
      toast({
        title: "Error Fetching Tickets",
        description: error.message || "Failed to get election tickets from blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get candidate details
  const getCandidateDetails = async (candidateId: number): Promise<Candidate> => {
    try {
      return await web3Service.getCandidateDetails(candidateId);
    } catch (error: any) {
      toast({
        title: "Error Fetching Candidate",
        description: error.message || "Failed to get candidate details from blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get candidate vote count
  const getCandidateVoteCount = async (candidateId: number): Promise<number> => {
    try {
      return await web3Service.getCandidateVoteCount(candidateId);
    } catch (error: any) {
      console.error(`Failed to get vote count for candidate ${candidateId}:`, error);
      return 0; // Return 0 if there's an error
    }
  };

  // Get ticket details
  const getTicketDetails = async (ticketId: number): Promise<PresidentVPTicket> => {
    try {
      return await web3Service.getTicketDetails(ticketId);
    } catch (error: any) {
      toast({
        title: "Error Fetching Ticket",
        description: error.message || "Failed to get ticket details from blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Get ticket vote count
  const getTicketVoteCount = async (ticketId: number): Promise<number> => {
    try {
      return await web3Service.getTicketVoteCount(ticketId);
    } catch (error: any) {
      console.error(`Failed to get vote count for ticket ${ticketId}:`, error);
      return 0; // Return 0 if there's an error
    }
  };

  // Check if voter has already voted
  const checkIfVoted = async (electionId: number): Promise<boolean> => {
    try {
      if (!isWalletConnected) {
        return false;
      }
      return await web3Service.checkIfVoted(electionId);
    } catch (error: any) {
      console.error(`Failed to check if voted in election ${electionId}:`, error);
      return false; // Assume not voted if there's an error
    }
  };

  // Vote for Senator
  const voteForSenator = async (electionId: number, candidateId: number): Promise<string> => {
    try {
      if (!isWalletConnected) {
        await connectWallet();
      }
      
      const txHash = await web3Service.voteForSenator(electionId, candidateId);
      
      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded on the blockchain",
        variant: "default",
      });
      
      return txHash;
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit your vote to the blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Vote for President/VP
  const voteForPresidentVP = async (electionId: number, ticketId: number): Promise<string> => {
    try {
      if (!isWalletConnected) {
        await connectWallet();
      }
      
      const txHash = await web3Service.voteForPresidentVP(electionId, ticketId);
      
      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded on the blockchain",
        variant: "default",
      });
      
      return txHash;
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit your vote to the blockchain",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Context value
  const contextValue: Web3ContextType = {
    isInitialized,
    isWalletConnected,
    walletAddress,
    connectWallet,
    getElectionDetails,
    getElectionCandidates,
    getElectionTickets,
    getCandidateDetails,
    getCandidateVoteCount,
    getTicketDetails,
    getTicketVoteCount,
    checkIfVoted,
    voteForSenator,
    voteForPresidentVP,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
}

// Custom hook to use the Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

// Export the enums for convenience
export { ElectionType, ElectionStatus };