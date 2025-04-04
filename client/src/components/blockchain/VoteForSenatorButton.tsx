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
  // All hooks must be at the top level of the component
  const { isWalletConnected, connectWallet } = useWeb3();
  const { toast } = useToast();
  
  // Voting state
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Election data state
  const [election, setElection] = useState<any>(null);
  const [isLoadingElection, setIsLoadingElection] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch election details on mount to check blockchain ID
  useEffect(() => {
    const fetchElection = async () => {
      setIsLoadingElection(true);
      try {
        const response = await fetch(`/api/elections/${electionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch election details');
        }
        
        const electionData = await response.json();
        setElection(electionData);
        
        if (!electionData.blockchainId) {
          setHasError(true);
          setErrorMessage('This election has not been deployed to the blockchain yet. Please contact an administrator.');
          
          // Log detailed information for debugging
          console.warn(`Election ${electionId} has no blockchain ID`, electionData);
        } else {
          setHasError(false);
          setErrorMessage(null);
          console.log(`Election ${electionId} has blockchain ID: ${electionData.blockchainId}`);
        }
      } catch (error) {
        console.error('Error fetching election:', error);
        setHasError(true);
        setErrorMessage('Failed to fetch election details from the server.');
      } finally {
        setIsLoadingElection(false);
      }
    };
    
    fetchElection();
  }, [electionId]);

  // Check vote status when wallet connection changes
  useEffect(() => {
    if (isWalletConnected && !hasError) {
      checkVoteStatus();
    }
  }, [isWalletConnected, electionId, hasError]);

  // Check if the user has already voted
  const checkVoteStatus = async () => {
    if (!isWalletConnected || !election || !election.blockchainId) return;
    
    setIsChecking(true);
    
    try {
      const blockchainElectionId = election.blockchainId;
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
    if (hasVoted || disabled || hasError || !election) return;
    
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
      // Use the blockchain ID if available, otherwise fallback to the database ID
      const blockchainElectionId = election.blockchainId;
      
      if (!blockchainElectionId) {
        throw new Error("This election has not been deployed to the blockchain yet.");
      }
      
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
      
      // Check for specific error types
      if (error.message && error.message.includes("user rejected")) {
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

  // Render different button states
  if (isLoadingElection) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} bg-gray-50 border-gray-200 text-gray-500`}
        disabled={true}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="font-medium">Loading...</span>
      </Button>
    );
  }
  
  if (hasError) {
    return (
      <div className="flex flex-col items-center">
        <Button
          variant="destructive"
          size={size}
          className={`${className}`}
          disabled={true}
          title={errorMessage || "This election is not properly deployed to the blockchain"}
        >
          <div className="flex items-center justify-center">
            <VoteIcon className="mr-2 h-4 w-4" />
            <span className="font-medium">Not Available</span>
          </div>
        </Button>
        {errorMessage && (
          <div className="text-xs text-red-600 mt-1 max-w-[200px] text-center">
            {errorMessage}
          </div>
        )}
      </div>
    );
  }

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

  // Default voting button
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