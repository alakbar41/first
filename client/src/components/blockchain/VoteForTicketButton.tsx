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
      
      console.log(`Voting in election ID: ${blockchainElectionId} (database ID: ${electionId}) for ticket ID: ${ticketId}`);
      
      // Import web3Service to check election status before voting
      const web3Service = (await import('@/lib/improved-web3-service')).default;
      
      try {
        // Get election details from blockchain to verify status
        const electionDetails = await web3Service.getElectionDetails(blockchainElectionId);
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        
        // If election is in pending status but should be active based on time, try to auto-update it
        if (electionDetails.status === 0 && 
            currentTime >= electionDetails.startTime && 
            currentTime <= electionDetails.endTime) {
          console.log(`Election ${blockchainElectionId} is in Pending status (0) but should be Active based on time. Attempting to update status...`);
          
          try {
            // Show toast notification that we're updating election status
            toast({
              title: "Updating Election Status",
              description: "This election needs to be activated on the blockchain. Please approve the transaction to continue.",
              duration: 8000,
            });
            
            // Try to auto-update the election status
            await web3Service.autoUpdateElectionStatus(blockchainElectionId);
            
            // Show success message
            toast({
              title: "Election Status Updated",
              description: "The election has been successfully activated on the blockchain. You can now vote.",
              variant: "default",
              duration: 5000,
            });
            
            console.log(`Successfully updated election ${blockchainElectionId} status on blockchain`);
          } catch (updateError: any) {
            console.error("Error updating election status:", updateError);
            throw new Error(`The election needs to be activated, but the update failed: ${updateError.message}. Please try again or contact an administrator.`);
          }
        } else if (electionDetails.status !== 1) { // Not active (0=pending, 2=completed, 3=cancelled)
          // Check if it should be active based on time
          if (currentTime >= electionDetails.startTime && currentTime <= electionDetails.endTime) {
            throw new Error(`The election time period is active (${new Date(electionDetails.startTime * 1000).toLocaleString()} - ${new Date(electionDetails.endTime * 1000).toLocaleString()}), but the status on blockchain is not set to active. Please contact an administrator.`);
          } else if (currentTime < electionDetails.startTime) {
            throw new Error(`This election hasn't started yet. It will begin at ${new Date(electionDetails.startTime * 1000).toLocaleString()}.`);
          } else {
            throw new Error(`This election has ended at ${new Date(electionDetails.endTime * 1000).toLocaleString()}.`);
          }
        }
      } catch (statusError: any) {
        // Only throw if this is not an unknown error that will be caught below
        if (!statusError.message.includes("execution reverted")) {
          throw statusError;
        }
        // For execution reverted, continue with the voting attempt as it might be a different issue
        console.warn("Received execution reverted during status check, continuing with vote attempt:", statusError);
      }
      
      // Use the improved blockchain integration to cast the vote
      const txHash = await voteForPresidentVP(blockchainElectionId, ticketId);
      
      toast({
        title: "Vote Successful",
        description: "Your vote has been recorded on the blockchain.",
        variant: "default",
      });
      
      setHasVoted(true);
      if (onVoteSuccess) onVoteSuccess(txHash);
    } catch (error: any) {
      console.error("Vote for President/VP error:", error);
      
      // Check for specific error types with enhanced pattern matching
      if (error.message && (error.message.includes("User denied transaction") || error.message.includes("user rejected"))) {
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
      } else if (error.message && (
          error.message.includes("execution reverted") || 
          error.message.includes("rejected by the smart contract") ||
          error.message.includes("unknown custom error")
        )) {
        // More detailed error message for execution reverted errors
        let errorDetails = "The blockchain transaction was rejected. ";
        
        if (error.message.includes("unknown custom error")) {
          // This is a common error signature when the blockchain contract throws an error
          errorDetails += "The contract returned an error. This usually happens when:\n\n" +
                          "• You've already voted in this election\n" +
                          "• The election is no longer active\n" + 
                          "• Your wallet is not eligible to vote in this election\n\n" +
                          "Please check your status and try again.";
        } else if (error.message.includes("ElectionNotActive")) {
          errorDetails += "This election is not currently active. Voting is only allowed during the active period.";
        } else if (error.message.includes("AlreadyVoted")) {
          errorDetails += "You have already voted in this election. Each voter can only vote once.";
        } else if (error.message.includes("InvalidTicket")) {
          errorDetails += "The president/VP ticket you're trying to vote for is not valid in this election.";
        } else if (error.message.includes("Cannot vote in election with status")) {
          errorDetails += "The election is not in an active state on the blockchain. Please contact an administrator to activate this election or try again later.";
        } else {
          errorDetails += "This may be because the election is no longer active, you have already voted, or are not registered to vote. If this persists, try refreshing the page to get updated contract status.";
        }
        
        toast({
          title: "Vote Failed",
          description: errorDetails,
          variant: "destructive",
          duration: 15000
        });
        
        // In many cases, this error indicates the user has already voted but our local state
        // doesn't reflect that, so let's manually check vote status again after a delay
        setTimeout(() => checkVoteStatus(), 2000);
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
          duration: 15000
        });
        
        // Log more detailed error information for debugging
        console.error("Detailed voting error:", {
          errorMessage: error.message,
          errorObject: error,
          electionId: electionId,
          blockchainElectionId: election?.blockchainId,
          ticketId: ticketId
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