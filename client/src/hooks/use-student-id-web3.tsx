import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import studentIdWeb3Service from '@/lib/student-id-web3-service';

interface StudentIdWeb3ContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  isWalletConnected: boolean;
  walletAddress: string;
  connectWallet: () => Promise<string>;
  reinitialize: () => Promise<void>;
  getCandidateVoteCount: (candidateId: number) => Promise<number>;
  getTicketVoteCount: (ticketId: number) => Promise<number>;
  getCandidateIdByStudentId: (studentId: string, forceRegister?: boolean) => Promise<number>;
  getTicketIdByStudentIds: (presidentId: string, vpId: string) => Promise<number>;
  voteForSenator: (electionId: number, candidateId: number) => Promise<boolean>;
  voteForPresidentVP: (electionId: number, ticketId: number) => Promise<boolean>;
  checkIfVoted: (electionId: number, address?: string) => Promise<boolean>;
}

const StudentIdWeb3Context = createContext<StudentIdWeb3ContextType | null>(null);

export function StudentIdWeb3Provider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Initialize Web3 service
  const initialize = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);
      
      const success = await studentIdWeb3Service.initialize();
      setIsInitialized(success);
      
      // Check if wallet is already connected
      if (studentIdWeb3Service.isWalletConnected()) {
        setIsWalletConnected(true);
        setWalletAddress(studentIdWeb3Service.getWalletAddress());
      }
    } catch (error: any) {
      console.error('Failed to initialize Web3:', error);
      setInitializationError(error.message || 'Failed to initialize blockchain connection');
    } finally {
      setIsInitializing(false);
    }
  };

  // Connect wallet
  const handleConnectWallet = async (): Promise<string> => {
    try {
      const address = await studentIdWeb3Service.connectWallet();
      setIsWalletConnected(true);
      setWalletAddress(address);
      return address;
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  // Initialize on component mount
  useEffect(() => {
    initialize();
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          setIsWalletConnected(false);
          setWalletAddress('');
        } else if (accounts[0] !== walletAddress) {
          // User switched account
          setWalletAddress(accounts[0]);
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      // Clean up event listener
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [walletAddress]);

  // Handler functions that pass through to the service
  const handleGetCandidateVoteCount = async (candidateId: number): Promise<number> => {
    try {
      return await studentIdWeb3Service.getCandidateVoteCount(candidateId);
    } catch (error) {
      console.error(`Failed to get vote count for candidate ${candidateId}:`, error);
      return 0;
    }
  };

  const handleGetTicketVoteCount = async (ticketId: number): Promise<number> => {
    try {
      return await studentIdWeb3Service.getTicketVoteCount(ticketId);
    } catch (error) {
      console.error(`Failed to get vote count for ticket ${ticketId}:`, error);
      return 0;
    }
  };

  const handleGetCandidateIdByStudentId = async (studentId: string, forceRegister: boolean = false): Promise<number> => {
    try {
      // First attempt to get the candidate ID normally
      try {
        const id = await studentIdWeb3Service.getCandidateIdByStudentId(studentId);
        if (id > 0) {
          console.log(`Found existing candidate ID ${id} for student ID ${studentId}`);
          return id;
        }
      } catch (lookupError) {
        console.warn(`Candidate with student ID ${studentId} not found, ${forceRegister ? 'will register' : 'not registering'}`);
      }
      
      // If we're here, either the ID wasn't found or was 0
      if (forceRegister) {
        console.log(`Registering candidate with student ID ${studentId}...`);
        const newId = await studentIdWeb3Service.registerCandidate(studentId);
        console.log(`Successfully registered candidate with ID ${newId} for student ID ${studentId}`);
        return newId;
      }
      
      // If we reach here, we couldn't find/register the candidate
      throw new Error(`No candidate found with student ID ${studentId}`);
    } catch (error) {
      console.error(`Failed to get/register candidate ID for student ID ${studentId}:`, error);
      throw error;
    }
  };

  const handleGetTicketIdByStudentIds = async (presidentId: string, vpId: string): Promise<number> => {
    try {
      return await studentIdWeb3Service.getTicketIdByStudentIds(presidentId, vpId);
    } catch (error) {
      console.error(`Failed to get ticket ID:`, error);
      throw error;
    }
  };

  const handleVoteForSenator = async (electionId: number, candidateId: number): Promise<boolean> => {
    try {
      return await studentIdWeb3Service.voteForSenator(electionId, candidateId);
    } catch (error) {
      console.error(`Failed to vote for senator in election ${electionId}:`, error);
      throw error;
    }
  };

  const handleVoteForPresidentVP = async (electionId: number, ticketId: number): Promise<boolean> => {
    try {
      return await studentIdWeb3Service.voteForPresidentVP(electionId, ticketId);
    } catch (error) {
      console.error(`Failed to vote for president/VP in election ${electionId}:`, error);
      throw error;
    }
  };

  const handleCheckIfVoted = async (electionId: number, address?: string): Promise<boolean> => {
    try {
      return await studentIdWeb3Service.checkIfVoted(electionId, address);
    } catch (error) {
      console.error(`Failed to check if address has voted in election ${electionId}:`, error);
      return false;
    }
  };

  return (
    <StudentIdWeb3Context.Provider value={{
      isInitialized,
      isInitializing,
      initializationError,
      isWalletConnected,
      walletAddress,
      connectWallet: handleConnectWallet,
      reinitialize: initialize,
      getCandidateVoteCount: handleGetCandidateVoteCount,
      getTicketVoteCount: handleGetTicketVoteCount,
      getCandidateIdByStudentId: handleGetCandidateIdByStudentId,
      getTicketIdByStudentIds: handleGetTicketIdByStudentIds,
      voteForSenator: handleVoteForSenator,
      voteForPresidentVP: handleVoteForPresidentVP,
      checkIfVoted: handleCheckIfVoted
    }}>
      {children}
    </StudentIdWeb3Context.Provider>
  );
}

export function useStudentIdWeb3() {
  const context = useContext(StudentIdWeb3Context);
  if (!context) {
    throw new Error('useStudentIdWeb3 must be used within a StudentIdWeb3Provider');
  }
  return context;
}