import { FC, ReactNode } from 'react';
import { Web3Provider } from '@/hooks/use-web3';

// This wrapper ensures that any blockchain components are properly wrapped with Web3Provider
// in case they are used outside the main App's Web3Provider context
export const BlockchainWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  // Check if we're already in a Web3Provider context
  try {
    // Try to import and use the Web3 context
    const { useWeb3 } = require('@/hooks/use-web3');
    try {
      useWeb3();
      // If we get here, we're already in a Web3Provider context, so just render children
      return <>{children}</>;
    } catch (error) {
      // If useWeb3 throws, we're not in a Web3Provider context, so wrap with provider
      console.log('Wrapping component with additional Web3Provider');
      return <Web3Provider>{children}</Web3Provider>;
    }
  } catch (error) {
    console.error('Failed to check Web3 context, wrapping with Web3Provider to be safe', error);
    return <Web3Provider>{children}</Web3Provider>;
  }
};