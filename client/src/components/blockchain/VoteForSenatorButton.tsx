import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { voteForSenator, checkIfVoted } from '@/lib/improved-blockchain-integration';
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
  const { isWalletConnected, connectWallet } = useWeb3();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check vote status when wallet connection changes
  useEffect(() => {
    if (isWalletConnected) {
      checkVoteStatus();
    }
  }, [isWalletConnected, electionId]);

  // Check if the user has already voted
  const checkVoteStatus = async () => {
    if (!isWalletConnected) return;
    
    setIsChecking(true);
    
    try {
      // First, get the election details to obtain the blockchain ID
      const response = await fetch(`/api/elections/${electionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch election details');
      }
      
      const election = await response.json();
      // Use the blockchain ID if available, otherwise fallback to the database ID
      const blockchainElectionId = election.blockchainId || electionId;
      console.log(`Checking vote status for election ID: ${blockchainElectionId} (database ID: ${electionId})`);
      
      const voted = await checkIfVoted(blockchainElectionId);
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
        // checkVoteStatus will be triggered by the useEffect
        return; // Exit early to let the useEffect handle the rest
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
      // Get the election details to obtain the blockchain ID
      const response = await fetch(`/api/elections/${electionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch election details');
      }
      
      const election = await response.json();
      // Use the blockchain ID if available, otherwise fallback to the database ID
      const blockchainElectionId = election.blockchainId || electionId;
      console.log(`Voting in election ID: ${blockchainElectionId} (database ID: ${electionId}) for candidate ID: ${candidateId}`);
      
      // Use the improved blockchain integration to cast the vote
      const txHash = await voteForSenator(blockchainElectionId, candidateId);
      
      toast({
        title: "Vote Successful",
        description: "Your vote has been recorded on the blockchain.",
        variant: "default",
      });
      
      setHasVoted(true);
      if (onVoteSuccess) onVoteSuccess(txHash);
    } catch (error: any) {
      console.error('Vote failed:', error);
      toast({
        title: "Voting Failed",
        description: error.message || "Failed to submit your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  if (hasVoted) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} text-green-700 bg-green-50 border-green-200 hover:bg-green-100 hover:text-green-800 transition-colors cursor-default`}
        disabled={true}
      >
        <Check className="mr-2 h-4 w-4" />
        <span className="font-medium">Voted</span>
      </Button>
    );
  }
  
  if (isVoting) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`${className} bg-purple-100 text-purple-800 border-purple-200`}
        disabled={true}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="font-medium">Submitting Vote...</span>
      </Button>
    );
  }
  
  if (isChecking) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} bg-gray-50 border-gray-200 text-gray-500`}
        disabled={true}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="font-medium">Checking Status...</span>
      </Button>
    );
  }

  return (
    <Button
      variant={disabled ? "outline" : "default"}
      size={size}
      className={`${className} ${disabled ? "bg-gray-50 border-gray-200 text-gray-400" : "bg-purple-600 hover:bg-purple-700 text-white"}`}
      onClick={handleVote}
      disabled={disabled}
    >
      <div className="flex items-center justify-center">
        <VoteIcon className="mr-2 h-4 w-4" />
        <span className="font-medium">Vote</span>
      </div>
    </Button>
  );
}