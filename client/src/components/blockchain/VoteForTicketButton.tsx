import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { voteForPresidentVP, checkIfVoted } from '@/lib/improved-blockchain-integration';
import { Loader2, Check, VoteIcon } from "lucide-react";

interface VoteForTicketButtonProps {
  electionId: number;
  ticketId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  disabled?: boolean;
  onVoteSuccess?: (txHash: string) => void;
}

export function VoteForTicketButton({ 
  electionId,
  ticketId,
  variant = "secondary", 
  size = "sm",
  className = "",
  disabled = false,
  onVoteSuccess
}: VoteForTicketButtonProps) {
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
      // Use the improved blockchain integration
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
      // Use the improved blockchain integration to cast the vote
      const txHash = await voteForPresidentVP(electionId, ticketId);
      
      toast({
        title: "Vote Successful",
        description: "Your vote has been recorded on the blockchain.",
        variant: "default",
      });
      
      setHasVoted(true);
      if (onVoteSuccess) onVoteSuccess(txHash);
    } catch (error: any) {
      console.error("Vote for President/VP error:", error);
      
      if (error.message && error.message.includes("User denied transaction")) {
        toast({
          title: "Transaction Rejected",
          description: "You rejected the transaction in MetaMask. Please try again when you're ready to vote.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("Internal JSON-RPC error")) {
        toast({
          title: "Network Congestion",
          description: "The Polygon Amoy testnet is experiencing high congestion. Please try again with manual configuration in MetaMask: click Edit during transaction confirmation and set Gas limit to 1500000, Max priority fee to 20 gwei, and Max fee to 50 gwei.",
          variant: "destructive",
          duration: 20000
        });
      } else if (error.message && error.message.includes("Transaction failed due to network congestion")) {
        toast({
          title: "Gas Settings Too Low",
          description: error.message,
          variant: "destructive",
          duration: 20000
        });
      } else if (error.message && (error.message.includes("execution reverted") || error.message.includes("rejected by the smart contract"))) {
        toast({
          title: "Vote Failed",
          description: "The blockchain transaction was rejected. This may be because the election is no longer active, you have already voted, or are not registered to vote. If this persists, try refreshing the page to get updated contract status.",
          variant: "destructive",
          duration: 10000
        });
      } else if (error.message && error.message.includes("insufficient funds")) {
        toast({
          title: "Insufficient Funds",
          description: "You do not have enough testnet MATIC to complete this transaction. Please obtain some Polygon Amoy testnet MATIC from a faucet.",
          variant: "destructive",
          duration: 10000
        });
      } else if (error.message && error.message.includes("This election hasn't started yet")) {
        toast({
          title: "Election Not Started",
          description: error.message,
          variant: "destructive",
          duration: 10000
        });
      } else if (error.message && error.message.includes("This election has ended")) {
        toast({
          title: "Election Ended",
          description: error.message,
          variant: "destructive",
          duration: 10000
        });
      } else {
        toast({
          title: "Voting Failed",
          description: error.message || "Failed to submit your vote. Please try again.",
          variant: "destructive",
        });
      }
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