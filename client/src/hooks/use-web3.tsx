import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  initializeWeb3, 
  connectWallet, 
  getWalletInfo,
  isRegisteredVoter
} from '@/lib/improved-blockchain-integration';

interface Web3ContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  isWalletConnected: boolean;
  walletAddress: string;
  isRegisteredVoter: boolean;
  isCheckingVoter: boolean;
  connectWallet: () => Promise<string>;
  reinitialize: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isVoter, setIsVoter] = useState(false);
  const [isCheckingVoter, setIsCheckingVoter] = useState(false);

  // Initialize Web3 service
  const initialize = async () => {
    try {
      setIsInitializing(true);
      setInitializationError(null);
      
      const success = await initializeWeb3();
      setIsInitialized(success);
      
      // Check if wallet is already connected
      const { isConnected, address } = getWalletInfo();
      setIsWalletConnected(isConnected);
      setWalletAddress(address || '');
      
      if (isConnected && address) {
        // Check if address is a registered voter
        setIsCheckingVoter(true);
        const voter = await isRegisteredVoter(address);
        setIsVoter(voter);
        setIsCheckingVoter(false);
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
      const address = await connectWallet();
      setIsWalletConnected(true);
      setWalletAddress(address);
      
      // Check if address is a registered voter
      setIsCheckingVoter(true);
      const voter = await isRegisteredVoter(address);
      setIsVoter(voter);
      setIsCheckingVoter(false);
      
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
          setIsVoter(false);
        } else if (accounts[0] !== walletAddress) {
          // User switched account
          setWalletAddress(accounts[0]);
          
          // Check if new address is a registered voter
          setIsCheckingVoter(true);
          const voter = await isRegisteredVoter(accounts[0]);
          setIsVoter(voter);
          setIsCheckingVoter(false);
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

  return (
    <Web3Context.Provider value={{
      isInitialized,
      isInitializing,
      initializationError,
      isWalletConnected,
      walletAddress,
      isRegisteredVoter: isVoter,
      isCheckingVoter,
      connectWallet: handleConnectWallet,
      reinitialize: initialize
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}

// Add this to window for TypeScript
declare global {
  interface Window {
    ethereum: any;
  }
}