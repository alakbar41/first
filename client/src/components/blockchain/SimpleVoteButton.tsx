import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import * as ethers from "ethers";

interface SimpleVoteButtonProps {
  electionId: number;
  candidateId: number;
  blockchainId?: number; // Optional blockchain ID if different from database ID
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  disabled?: boolean;
  onVoteSuccess?: (txHash: string) => void;
}

// State for vote process
type VoteState = 'idle' | 'requesting-token' | 'token-received' | 'connecting-wallet' | 'submitting-vote' | 'recording-vote';

// Token-based secure voting implementation
export function SimpleVoteButton({ 
  electionId,
  candidateId,
  blockchainId,
  variant = "default", 
  size = "default",
  className = "",
  disabled = false,
  onVoteSuccess
}: SimpleVoteButtonProps) {
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isVoting = voteState !== 'idle';
  
  // Request a voting token from the server
  const requestVotingToken = async (): Promise<string> => {
    try {
      setVoteState('requesting-token');
      
      const response = await apiRequest('POST', '/api/voting-tokens', {
        electionId
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get voting token');
      }
      
      const data = await response.json();
      return data.token;
    } catch (error: any) {
      console.error('Failed to get voting token:', error);
      throw error;
    }
  };
  
  // Verify token is valid before voting
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/voting-tokens/verify', {
        token,
        electionId,
        candidateId
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };
  
  // Mark token as used after successful vote
  const markTokenAsUsed = async (token: string, txHash: string): Promise<void> => {
    try {
      const response = await apiRequest('POST', '/api/voting-tokens/use', {
        token,
        electionId,
        candidateId
      });
      
      if (!response.ok) {
        console.warn('Failed to mark token as used, but vote was successful');
      }
    } catch (error) {
      console.error('Failed to mark token as used:', error);
      // We don't throw here since the vote was successful
    }
  };

  // Main vote handler function
  const handleVote = async () => {
    if (isVoting || disabled) return;
    
    try {
      // Step 1: Request voting token from server
      let token;
      try {
        token = await requestVotingToken();
        setVotingToken(token);
        setVoteState('token-received');
        
        toast({
          title: "Voting token received",
          description: "Your one-time voting token has been issued.",
          duration: 3000,
        });
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        
        if (errorMessage.includes('already voted')) {
          toast({
            title: "Already voted",
            description: "You have already voted in this election.",
            variant: "destructive",
            duration: 5000,
          });
        } else {
          toast({
            title: "Token error",
            description: `Failed to get voting token: ${errorMessage}`,
            variant: "destructive",
            duration: 5000,
          });
        }
        
        setVoteState('idle');
        setVotingToken(null);
        return;
      }
      
      // Step 2: Check if token is valid
      const isTokenValid = await verifyToken(token);
      if (!isTokenValid) {
        toast({
          title: "Invalid token",
          description: "Your voting token is invalid or has expired. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        
        setVoteState('idle');
        setVotingToken(null);
        return;
      }
      
      // Step 3: Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to vote.');
      }
      
      // Step 4: Connect to wallet
      setVoteState('connecting-wallet');
      toast({
        title: "Connecting to wallet...",
        description: "Please approve the connection request in your wallet.",
        duration: 5000,
      });
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Step 4.5: Check if we're on the correct network (Polygon Amoy)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // If already on Polygon Amoy, continue without prompt
      if (chainId === '0x13882') { // 80002 in hex
        console.log('Already on Polygon Amoy network, chainId: 0x13882 (80002)');
      } else {
        toast({
          title: "Network check",
          description: "Checking if we're on the Polygon Amoy network...",
          duration: 3000,
        });
        
        try {
          console.log('Current chainId:', chainId, 'Need to switch to Polygon Amoy: 0x13882');
          
          // First try to switch to the network if it's already added
          try {
            console.log('Attempting to switch to Polygon Amoy network');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x13882' }], // 80002 in hex
            });
            console.log('Successfully switched to Polygon Amoy network');
          } catch (switchError: any) {
            console.log('Switch network error:', switchError.code, switchError.message);
            
            // This error code (4902) means the chain has not been added to MetaMask
            if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
              console.log('Polygon Amoy network not found in wallet, attempting to add it');
              
              // Try to add the network
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x13882', // 80002 in hex
                    chainName: 'Polygon Amoy',
                    nativeCurrency: {
                      name: 'POL',
                      symbol: 'POL',
                      decimals: 18,
                    },
                    rpcUrls: ['https://rpc-amoy.polygon.technology'],
                    blockExplorerUrls: ['https://amoy.polygonscan.com'],
                  },
                ],
              });
              console.log('Successfully added Polygon Amoy network');
            } else {
              throw switchError;
            }
          }
          
          toast({
            title: "Network switched",
            description: "Successfully connected to Polygon Amoy network",
            duration: 3000,
          });
        } catch (networkError: any) {
          console.error('Failed to switch to Polygon Amoy network:', networkError);
          throw new Error('Please switch to the Polygon Amoy network in your MetaMask wallet to vote');
        }
      }
      
      // Step 5: Submit vote transaction
      setVoteState('submitting-vote');
      
      // IMPORTANT: We must use the blockchain ID if provided, as the database ID won't match what's on the blockchain
      const actualElectionId = blockchainId || electionId;
      
      // Function signature for vote(uint256,uint256,uint256)
      const functionSignature = '0x0121b93f';
      
      // Convert parameters to 32-byte hex strings
      const toHex32 = (num: number): string => {
        return Math.floor(num).toString(16).padStart(64, '0');
      };
      
      // Construct data manually for maximum compatibility
      const data = functionSignature + 
                  toHex32(actualElectionId) + 
                  toHex32(candidateId) + 
                  toHex32(0); // nonce = 0
      
      console.log("Voting for election ID:", actualElectionId, "candidate ID:", candidateId);
      console.log("Database election ID:", electionId, "Blockchain election ID:", blockchainId || "same as database");
      console.log("Contract address:", '0xb74F07812B45dBEc4eC3E577194F6a798a060e5D');
      console.log("Using secured voting token");
      
      toast({
        title: "Submitting vote...",
        description: "Please approve the transaction in your wallet. IMPORTANT: If the gas fee is too high, click 'Edit' in MetaMask and manually lower the gas price to 0.1 Gwei or less.",
        duration: 20000,
      });
      
      // Set ultra-minimal gas parameters to force a very low fee
      // We need to override MetaMask's estimates which are too high for test networks
      const txParams = {
        from: account,
        to: '0xb74F07812B45dBEc4eC3E577194F6a798a060e5D',
        data: data,
        // Use absolute minimum gas price the network will accept
        gasPrice: '0x174876E800', // 0.1 Gwei (100,000,000 wei) in hex - absolute minimum
        // Ultra low gas limit - bare minimum for vote function
        gas: '0x186A0' // 100,000 in hex - enough for a vote
      };
      
      console.log("Sending transaction with optimized parameters:", txParams);
      
      // Get transaction hash from MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      // IMPORTANT: We need to wait for transaction confirmation before marking token as used
      // Show waiting message
      toast({
        title: "Vote submitted!",
        description: "Waiting for blockchain confirmation. This may take a few moments...",
        duration: 10000,
      });
      
      // Step 6: Wait for transaction confirmation and only then mark token as used
      try {
        // Set state to recording (waiting for confirmation)
        setVoteState('recording-vote');
        
        // Wait for transaction receipt to check if it was successful
        console.log(`Waiting for transaction confirmation: ${txHash}`);
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const receipt = await provider.waitForTransaction(txHash);
          
          if (receipt) {
            console.log('Transaction receipt received:', receipt);
            
            // Log the type and value of receipt.status to debug
            console.log('Receipt status type:', typeof receipt.status);
            console.log('Receipt status value:', receipt.status);
            
            // More lenient success check - consider success unless explicitly failed
            // For Amoy testnet, we'll accept any non-explicit failure as success
            const succeeded = receipt.status !== 0 && 
                             (typeof receipt.status === 'string' ? receipt.status !== "0x0" : true);
            
            if (succeeded) {
              console.log('Transaction confirmed successfully!', receipt);
              
              // Only mark token as used if transaction succeeded
              await markTokenAsUsed(token, txHash);
              
              toast({
                title: "Vote recorded!",
                description: "Your vote has been successfully processed on the blockchain.",
                duration: 5000,
              });
              
              if (onVoteSuccess) {
                onVoteSuccess(txHash);
              }
              
              return; // Success case, exit the function
            } else {
              console.error('Transaction status indicated failure:', receipt);
              throw new Error('Transaction failed with status: ' + (receipt.status ?? 'unknown'));
            }
          } else {
            throw new Error('No receipt returned');
          }
        } catch (waitError) {
          console.error('Error waiting for transaction receipt:', waitError);
          
          // Here's our backup check - even if waitForTransaction fails, the transaction might have succeeded
          // Let's try to fetch the transaction status manually
          try {
            // Try to get transaction by hash as a backup
            const provider = new ethers.BrowserProvider(window.ethereum);
            const tx = await provider.getTransaction(txHash);
            
            if (tx && tx.blockNumber) {
              console.log('Transaction found in a block, likely successful:', tx);
              
              // If we find the transaction in a block, assume it succeeded
              await markTokenAsUsed(token, txHash);
              
              toast({
                title: "Vote likely recorded!",
                description: "Transaction found on the blockchain. Your vote was likely processed successfully.",
                duration: 5000,
              });
              
              if (onVoteSuccess) {
                onVoteSuccess(txHash);
              }
              
              return; // Exit with success
            }
          } catch (backupError) {
            console.error('Backup transaction check also failed:', backupError);
          }
          
          // If we get here, both checks failed
          throw new Error('Could not confirm transaction success');
        }
      } catch (receiptError) {
        console.error("Transaction receipt error:", receiptError);
        
        // If we get here, the transaction failed or we couldn't get a receipt
        toast({
          title: "Vote failed",
          description: "The blockchain transaction failed. You can try voting again.",
          variant: "destructive",
          duration: 10000,
        });
        
        // Don't call onVoteSuccess since the vote failed
        throw new Error('Transaction confirmation failed');
      }
    } catch (error: any) {
      console.error('Vote failed:', error);
      
      // Extract the message from the error object
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        toast({
          title: "Transaction rejected",
          description: "You cancelled the transaction in your wallet.",
          variant: "destructive",
          duration: 5000,
        });
      } else if (errorMessage.includes('insufficient funds')) {
        toast({
          title: "Insufficient funds",
          description: "You need testnet MATIC tokens to pay for this transaction. Please get some from a faucet.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (errorMessage.includes('Internal JSON-RPC error') || errorMessage.includes('could not be mined')) {
        // Try to extract more detail from the error
        let detailedError = "Unknown blockchain error";
        try {
          // Often the actual error is nested inside
          if (error.error && error.error.message) {
            detailedError = error.error.message;
          } else if (error.data && error.data.message) {
            detailedError = error.data.message;
          }
        } catch (e) {
          console.log("Could not extract detailed error:", e);
        }
        
        console.log("Transaction failed with detailed error:", detailedError);
        
        toast({
          title: "Transaction error",
          description: "The vote couldn't be processed. This is likely due to network congestion on Polygon Amoy. Please try again in a moment.",
          variant: "destructive",
          duration: 15000,
        });
      } else if (errorMessage.includes('execution reverted')) {
        toast({
          title: "Vote rejected by contract",
          description: "Your transaction was sent but rejected by the smart contract. This may be because the election is not active yet on the blockchain.",
          variant: "destructive",
          duration: 15000,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to submit vote: ${errorMessage}`,
          variant: "destructive",
          duration: 10000,
        });
      }
    } finally {
      setVoteState('idle');
      setVotingToken(null);
    }
  };
  
  // Show different button states based on the current vote state
  const renderButtonContent = () => {
    switch (voteState) {
      case 'requesting-token':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing...
          </>
        );
      case 'token-received':
      case 'connecting-wallet':
        return (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Connecting...
          </>
        );
      case 'submitting-vote':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        );
      case 'recording-vote':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recording...
          </>
        );
      default:
        return (
          <>
            <VoteIcon className="mr-2 h-4 w-4" />
            Vote
          </>
        );
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isVoting}
      onClick={handleVote}
    >
      {renderButtonContent()}
    </Button>
  );
}