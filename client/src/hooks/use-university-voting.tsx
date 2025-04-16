import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import universityVotingService from '../lib/university-voting-service';

// Define the context type
interface UniversityVotingContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  isWalletConnected: boolean;
  walletAddress: string;
  connectWallet: () => Promise<string>;
  reinitialize: () => Promise<void>;
}

// Create the context with a default value
const UniversityVotingContext = createContext<UniversityVotingContextType | null>(null);

// Provider component
export function UniversityVotingProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Initialize the service
  const initialize = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);
      
      // Initialize the UniversityVotingService
      const success = await universityVotingService.initialize();
      setIsInitialized(success);
      
      // Check if wallet is already connected
      if (universityVotingService.isWalletConnected()) {
        setIsWalletConnected(true);
        setWalletAddress(universityVotingService.getWalletAddress());
      }
    } catch (error: any) {
      console.error('Failed to initialize UniversityVotingService:', error);
      setInitializationError(error.message || 'Failed to initialize blockchain connection');
    } finally {
      setIsInitializing(false);
    }
  };

  // Connect wallet handler
  const handleConnectWallet = async (): Promise<string> => {
    try {
      const address = await universityVotingService.connectWallet();
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
  }, []);

  // Provide the context value
  return (
    <UniversityVotingContext.Provider value={{
      isInitialized,
      isInitializing,
      initializationError,
      isWalletConnected,
      walletAddress,
      connectWallet: handleConnectWallet,
      reinitialize: initialize
    }}>
      {children}
    </UniversityVotingContext.Provider>
  );
}

// Hook to use the context
export function useUniversityVoting() {
  const context = useContext(UniversityVotingContext);
  if (!context) {
    throw new Error('useUniversityVoting must be used within a UniversityVotingProvider');
  }
  return context;
}

// Export the service directly for direct access to its methods
export { universityVotingService };