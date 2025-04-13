import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import * as ethers from "ethers";
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
// Get the imported service directly from the hook
// We don't need a separate import as we'll use the service from the hook

interface EnhancedSimpleVoteButtonProps {
  electionId: number;
  candidateId: number;
  studentId: string; // Student ID is required for the improved contract
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  disabled?: boolean;
  onVoteSuccess?: (txHash: string) => void;
}

// State for vote process
type VoteState = 'idle' | 'requesting-token' | 'token-received' | 'connecting-wallet' | 'submitting-vote' | 'recording-vote';

// Token-based secure voting implementation with student ID support
export function EnhancedSimpleVoteButton({ 
  electionId,
  candidateId,
  studentId,
  variant = "default", 
  size = "default",
  className = "",
  disabled = false,
  onVoteSuccess
}: EnhancedSimpleVoteButtonProps) {
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const { toast } = useToast();
  const { 
    isInitialized,
    voteForSenator,
    getCandidateIdByStudentId
  } = useStudentIdWeb3();
  
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
        candidateId,
        txHash, // Include the transaction hash for verification
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
      // Step 1: Check if we're initialized with wallet
      if (!isInitialized) {
        toast({
          title: "Blockchain not initialized",
          description: "Please connect your wallet first.",
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      
      // Step 2: Request voting token from server
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
      
      // Step 3: Check if token is valid
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
      
      // Step 4: Get the blockchain IDs for the election and candidate
      setVoteState('submitting-vote');
      
      try {
        // Get the correct election from the database
        const electionResponse = await fetch(`/api/elections/${electionId}`);
        if (!electionResponse.ok) {
          throw new Error(`Failed to fetch election ${electionId}`);
        }
        const election = await electionResponse.json();
        
        if (!election.blockchainId) {
          // If not deployed to blockchain, we can't vote
          toast({
            title: "Election not deployed",
            description: "This election has not been deployed to the blockchain yet.",
            variant: "destructive",
            duration: 5000,
          });
          throw new Error("Election not deployed to blockchain");
        }
        
        // Get the blockchain candidate ID by student ID
        console.log(`Looking up blockchain candidate ID for student ID: ${studentId}`);
        let blockchainCandidateId;
        try {
          // First attempt to get candidate ID directly
          blockchainCandidateId = await getCandidateIdByStudentId(studentId);
          
          if (!blockchainCandidateId || blockchainCandidateId <= 0) {
            console.warn(`Initial lookup failed for student ID: ${studentId}, trying to register it now...`);
            
            // Use the enhanced getCandidateIdByStudentId which can register candidates if needed
            try {
              // Register + get ID in one step (will automatically try to register if not found)
              blockchainCandidateId = await getCandidateIdByStudentId(studentId, true);
              console.log(`Successfully obtained candidate ID ${blockchainCandidateId} for student ID: ${studentId}`);
              
              if (!blockchainCandidateId || blockchainCandidateId <= 0) {
                throw new Error("Could not obtain a valid candidate ID");
              }
            } catch (regError: any) {
              console.error("Registration/retrieval error:", regError);
              
              // Try one more time without registration in case the registration succeeded but 
              // we didn't get the ID properly
              if (regError.message && regError.message.toLowerCase().includes("already registered")) {
                // If already registered, try one more time to get the ID
                console.log("Candidate was already registered, trying to get ID one more time...");
                blockchainCandidateId = await getCandidateIdByStudentId(studentId);
                
                if (!blockchainCandidateId || blockchainCandidateId <= 0) {
                  throw new Error("Candidate exists but ID retrieval failed");
                }
                console.log(`Retrieved existing candidate ID: ${blockchainCandidateId}`);
              } else {
                throw regError; // Re-throw if it's not an "already registered" error
              }
            }
          }
          
          console.log(`Found blockchain candidate ID: ${blockchainCandidateId} for student ID: ${studentId}`);
        } catch (err: any) {
          console.error("Error getting or registering candidate by student ID:", err);
          
          // Detailed error handling for different scenarios
          let errorMsg = "Failed to find this candidate on the blockchain.";
          let errorTitle = "Candidate not registered on blockchain";
          
          // Check for specific error messages
          const errorString = err.toString().toLowerCase();
          const errorReason = err?.reason?.toString().toLowerCase() || "";
          
          if (errorReason.includes("no candidate found") || errorString.includes("no candidate found")) {
            errorMsg = "This candidate needs to be registered on the blockchain by an admin. Please contact the election administrator.";
            errorTitle = "Candidate registration required";
          } else if (errorString.includes("already registered")) {
            errorMsg = "This candidate is already registered but we couldn't retrieve their ID. Please try again later.";
            errorTitle = "Retrieval error";
          }
          
          toast({
            title: errorTitle,
            description: errorMsg,
            variant: "destructive",
            duration: 5000,
          });
          throw new Error("Failed to get blockchain candidate ID: " + (err.message || err));
        }
        
        // Step 5: Submit vote transaction using the student ID web3 service
        // Make sure blockchainId is numeric; if not, try using the timestamp
        let electionIdentifier = election.blockchainId;
        
        // If using timestamp as identifier (our improved approach)
        if (!electionIdentifier || isNaN(Number(electionIdentifier))) {
          console.log("No valid blockchainId found, using timestamp as identifier");
          electionIdentifier = Math.floor(new Date(election.startDate).getTime() / 1000);
        }
        
        console.log(`Voting for election using identifier: ${electionIdentifier}, candidate ID: ${blockchainCandidateId}`);
        
        toast({
          title: "Submitting vote...",
          description: "Please approve the transaction in your wallet.",
          duration: 10000,
        });
        
        // Now vote using the improved student ID web3 service
        const success = await voteForSenator(electionIdentifier, blockchainCandidateId);
        
        if (success) {
          // Step 6: Mark token as used after successful vote
          await markTokenAsUsed(token, "blockchain-transaction-hash"); // We don't get a txHash from the service
          
          toast({
            title: "Vote recorded successfully!",
            description: "Your vote has been recorded on the blockchain.",
            duration: 5000,
          });
          
          // Notify parent component
          if (onVoteSuccess) {
            onVoteSuccess("blockchain-transaction-success");
          }
        } else {
          throw new Error("Vote transaction failed");
        }
      } catch (error: any) {
        console.error("Error during voting process:", error);
        
        // Display detailed error to user
        toast({
          title: "Vote failed",
          description: `Error: ${error?.message || 'Unknown error'}`,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error("Unexpected error in vote process:", error);
      
      // Display error to user
      toast({
        title: "Vote failed",
        description: `An unexpected error occurred: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      // Reset state
      setVoteState('idle');
      setVotingToken(null);
    }
  };
  
  // Button display state
  const getButtonText = () => {
    switch (voteState) {
      case 'requesting-token':
        return "Preparing...";
      case 'token-received':
        return "Validating...";
      case 'connecting-wallet':
        return "Connecting...";
      case 'submitting-vote':
        return "Voting...";
      case 'recording-vote':
        return "Recording...";
      default:
        return "Vote";
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleVote}
      disabled={isVoting || disabled || !isInitialized}
    >
      {isVoting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <VoteIcon className="mr-2 h-4 w-4" />
      )}
      {getButtonText()}
    </Button>
  );
}