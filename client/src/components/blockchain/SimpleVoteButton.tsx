import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon } from "lucide-react";
import { ethers } from 'ethers';

// Contract address on Polygon Amoy
const CONTRACT_ADDRESS = '0xb74f07812b45DBEc4eC3E577194F6a798a060e5D';
// Vote function ABI signature
const VOTE_FUNCTION_ABI = ['function vote(uint256 electionId, uint256 candidateId, uint256 nonce)'];

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
  
  // Simple direct vote function that uses minimum gas
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
      
      // Use ethers.js to create a Web3Provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, VOTE_FUNCTION_ABI, signer);
      
      // Use the blockchain ID if provided, otherwise fallback to database ID
      const actualElectionId = blockchainId || electionId;
      
      toast({
        title: "Submitting vote...",
        description: "Please confirm the transaction in your wallet. Set gas limit to 80,000 for best results.",
        duration: 10000,
      });
      
      // Execute vote function with explicit gas settings
      const tx = await contract.vote(
        actualElectionId, 
        candidateId,
        0, // nonce parameter (always 0 for typical voting)
        {
          // Use minimal gas settings
          gasLimit: 80000,
          // For EIP-1559 transactions (type 2)
          maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"),
          maxFeePerGas: ethers.parseUnits("3", "gwei"),
          type: 2
        }
      );
      
      toast({
        title: "Transaction submitted",
        description: "Your vote is being recorded on the blockchain. Please wait for confirmation.",
        duration: 5000,
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      toast({
        title: "Vote successful!",
        description: "Your vote has been recorded on the blockchain.",
        duration: 5000,
      });
      
      if (onVoteSuccess) {
        onVoteSuccess(receipt.hash);
      }
    } catch (error: any) {
      console.error('Vote failed:', error);
      
      // Handle specific error messages
      if (error.message?.includes('user rejected')) {
        toast({
          title: "Transaction rejected",
          description: "You rejected the transaction in your wallet.",
          variant: "destructive",
          duration: 5000,
        });
      } else if (error.message?.includes('insufficient funds')) {
        toast({
          title: "Insufficient funds",
          description: "You don't have enough MATIC to complete this transaction. Please get some testnet MATIC from a faucet.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (error.message?.includes('execution reverted')) {
        toast({
          title: "Transaction failed",
          description: "The vote was rejected by the smart contract. This usually happens if you've already voted or if the election is not active.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to vote: ${error.message || "Unknown error"}`,
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