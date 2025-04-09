import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon } from "lucide-react";

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

// Minimal voting implementation with only essential parameters
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
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();
  
  // Ultra-simplified vote function for maximum compatibility
  const handleVote = async () => {
    if (isVoting || disabled) return;
    
    setIsVoting(true);
    
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to vote.');
      }
      
      toast({
        title: "Connecting to wallet...",
        description: "Please approve the connection request in your wallet.",
        duration: 5000,
      });
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
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
      
      toast({
        title: "Submitting vote...",
        description: "Please approve the transaction in your wallet",
        duration: 10000,
      });
      
      // Use explicit low gas settings to reduce costs
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: '0xb74F07812B45dBEc4eC3E577194F6a798a060e5D',
          data: data,
          gas: '0x00F4240', // 1,000,000 gas limit in hex (providing extra gas but that doesn't mean it will use all of it)
          gasPrice: '0x03B9ACA00' // 1 gwei in hex (using legacy gasPrice which is more compatible)
        }],
      });
      
      toast({
        title: "Transaction submitted",
        description: "Your vote is being processed on the blockchain.",
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
      } else if (errorMessage.includes('Internal JSON-RPC error')) {
        toast({
          title: "Network error",
          description: "There was a problem with the network connection. You may need testnet MATIC tokens or to adjust gas settings manually.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (errorMessage.includes('execution reverted')) {
        toast({
          title: "Vote rejected by contract",
          description: "Your transaction was sent but rejected by the smart contract. Common reasons: 1) You've already voted in this election, 2) The election is not active on the blockchain yet, 3) The blockchain ID doesn't match.",
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
      setIsVoting(false);
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
      {isVoting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <VoteIcon className="mr-2 h-4 w-4" />
          Vote
        </>
      )}
    </Button>
  );
}