import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
      setVoteState('recording-vote');
      
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
        description: "Please approve the transaction in your wallet",
        duration: 10000,
      });
      
      // This approach uses minimal parameters and lets MetaMask calculate gas
      // Focus on making a clean transaction that works on the Amoy testnet
      const txParams = {
        from: account,
        to: '0xb74F07812B45dBEc4eC3E577194F6a798a060e5D',
        data: data
      };
      
      console.log("Sending transaction with optimized parameters:", txParams);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      // Step 6: Mark token as used in database
      try {
        await markTokenAsUsed(token, txHash);
      } catch (error) {
        console.error("Failed to mark token as used, but vote was successful:", error);
      }
      
      toast({
        title: "Vote recorded!",
        description: "Your vote has been successfully processed on the blockchain.",
        duration: 5000,
      });
      
      if (onVoteSuccess && txHash) {
        onVoteSuccess(txHash);
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
        toast({
          title: "Transaction error",
          description: "The vote couldn't be processed due to blockchain network issues. Please wait a moment and try again.",
          variant: "destructive",
          duration: 10000,
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