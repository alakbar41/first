import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, VoteIcon } from "lucide-react";

interface VoteForSenatorButtonProps {
  electionId: number;
  candidateId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  disabled?: boolean;
  onVoteSuccess?: (txHash: string) => void;
}

export function VoteForSenatorButton({ 
  electionId,
  candidateId,
  variant = "secondary", 
  size = "sm",
  className = "",
  disabled = false,
  onVoteSuccess
}: VoteForSenatorButtonProps) {
  const { isWalletConnected, connectWallet, voteForSenator, checkIfVoted } = useWeb3();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check if the user has already voted when the component mounts or wallet connects
  const checkVoteStatus = async () => {
    if (!isWalletConnected) return;
    
    setIsChecking(true);
    try {
      const voted = await checkIfVoted(electionId);
      setHasVoted(voted);
    } catch (error) {
      console.error('Failed to check vote status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleVote = async () => {
    if (hasVoted || disabled) return;
    
    // Connect wallet first if not connected
    if (!isWalletConnected) {
      try {
        await connectWallet();
        await checkVoteStatus(); // Check if they've already voted after connecting
        if (hasVoted) return; // Don't proceed if they've already voted
      } catch (error) {
        toast({
          title: "Wallet Connection Required",
          description: "Please connect your wallet to vote.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsVoting(true);
    try {
      const txHash = await voteForSenator(electionId, candidateId);
      
      toast({
        title: "Vote Successful",
        description: "Your vote has been recorded on the blockchain.",
        variant: "default",
      });
      
      setHasVoted(true);
      if (onVoteSuccess) onVoteSuccess(txHash);
    } catch (error: any) {
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleVote}
      disabled={disabled || isVoting || hasVoted || isChecking}
    >
      {isVoting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Voting...
        </>
      ) : isChecking ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking...
        </>
      ) : hasVoted ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Voted
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