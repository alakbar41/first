import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface EnhancedSimpleVoteButtonProps {
  electionId: number;
  candidateId: number;
  studentId: string;
  candidateName: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  className?: string;
}

/**
 * EnhancedSimpleVoteButton Component
 * 
 * An improved voting button with robust error handling and fallback mechanisms
 * to address blockchain ID mismatches and transaction failures.
 */
export function EnhancedSimpleVoteButton({
  electionId,
  candidateId,
  studentId,
  candidateName,
  disabled = false,
  onSuccess,
  onError,
  className = ''
}: EnhancedSimpleVoteButtonProps) {
  const { toast } = useToast();
  const { isWalletConnected, walletAddress, connectWallet, voteForSenator, getCandidateIdByStudentId, studentIdWeb3Service } = useStudentIdWeb3();
  
  const [isVoting, setIsVoting] = useState(false);
  const [isVerifyingVote, setIsVerifyingVote] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState<number | null>(null);
  const [blockchainElectionId, setBlockchainElectionId] = useState<number | null>(null);
  const [blockchainCandidateId, setBlockchainCandidateId] = useState<number | null>(null);
  
  // Check if the user has already voted in this election
  const checkIfVoted = async () => {
    if (!isWalletConnected || !walletAddress) return;
    
    try {
      // Try multiple election IDs if necessary (fallback mechanism)
      const possibleIds = [electionId, blockchainElectionId].filter(Boolean) as number[];
      
      for (const id of possibleIds) {
        try {
          const voted = await studentIdWeb3Service.checkIfVoted(id, walletAddress);
          if (voted) {
            console.log(`User has already voted in election ${id}`);
            setHasVoted(true);
            return true;
          }
        } catch (err) {
          console.warn(`Failed to check if voted for election ID ${id}:`, err);
        }
      }
      
      setHasVoted(false);
      return false;
    } catch (error) {
      console.error('Error checking if voted:', error);
      return false;
    }
  };
  
  // Fetch blockchain election ID if it exists in the database
  const fetchBlockchainElectionId = async () => {
    try {
      const response = await apiRequest<{ blockchainId?: number }>(`/api/elections/${electionId}/blockchain-info`);
      
      if (response?.blockchainId && response.blockchainId > 0) {
        console.log(`Retrieved blockchain election ID ${response.blockchainId} for database ID ${electionId}`);
        setBlockchainElectionId(response.blockchainId);
        return response.blockchainId;
      }
      
      return null;
    } catch (err) {
      console.warn(`Could not retrieve blockchain ID for election ${electionId}:`, err);
      return null;
    }
  };
  
  // Resolve the candidate's blockchain ID from student ID
  const resolveCandidateBlockchainId = async () => {
    try {
      // First try to get from the database
      try {
        const response = await apiRequest<{ blockchainId?: number }>(`/api/candidates/${candidateId}/blockchain-info`);
        
        if (response?.blockchainId && response.blockchainId > 0) {
          console.log(`Retrieved blockchain candidate ID ${response.blockchainId} for database ID ${candidateId}`);
          setBlockchainCandidateId(response.blockchainId);
          return response.blockchainId;
        }
      } catch (dbErr) {
        console.warn(`Could not retrieve blockchain ID for candidate ${candidateId} from database:`, dbErr);
      }
      
      // If database lookup fails, try blockchain lookup
      try {
        if (!studentId) {
          throw new Error("No student ID available to look up blockchain candidate ID");
        }
        
        console.log(`Looking up blockchain candidate ID for student ID ${studentId}...`);
        const blockchainId = await getCandidateIdByStudentId(studentId);
        
        if (blockchainId > 0) {
          console.log(`Found blockchain candidate ID ${blockchainId} for student ID ${studentId}`);
          setBlockchainCandidateId(blockchainId);
          
          // Save this mapping to the database for future use
          try {
            await apiRequest('/api/candidates/update-blockchain-id', {
              method: 'POST',
              body: {
                candidateId,
                blockchainId
              }
            });
            console.log(`Updated candidate ${candidateId} with blockchain ID ${blockchainId}`);
          } catch (saveErr) {
            console.warn('Failed to save blockchain ID to database:', saveErr);
          }
          
          return blockchainId;
        }
      } catch (lookupErr) {
        console.warn(`Could not find blockchain ID for student ID ${studentId}:`, lookupErr);
      }
      
      // If we still don't have an ID, return null
      return null;
    } catch (err) {
      console.error('Error resolving candidate blockchain ID:', err);
      return null;
    }
  };
  
  // Verify election exists on blockchain before voting
  const verifyElectionExists = async (id: number): Promise<boolean> => {
    try {
      console.log(`Verifying election ${id} exists on blockchain...`);
      const details = await studentIdWeb3Service.getElectionDetails(id);
      return Boolean(details);
    } catch (err) {
      console.warn(`Election ${id} does not exist on blockchain:`, err);
      return false;
    }
  };
  
  // Handle the voting process with fallback mechanisms
  const handleVote = async () => {
    if (disabled || isVoting || hasVoted) return;
    
    try {
      setIsVoting(true);
      
      // Connect wallet if not connected
      if (!isWalletConnected) {
        try {
          await connectWallet();
        } catch (walletError: any) {
          console.error('Failed to connect wallet:', walletError);
          toast({
            variant: "destructive",
            title: "Wallet Connection Failed",
            description: walletError.message || "Could not connect to your wallet",
          });
          setIsVoting(false);
          if (onError) onError(walletError);
          return;
        }
      }
      
      // Check if user has already voted
      const alreadyVoted = await checkIfVoted();
      if (alreadyVoted) {
        toast({
          title: "Already Voted",
          description: "You have already voted in this election",
        });
        setIsVoting(false);
        return;
      }
      
      console.log(`Voting for election ID ${electionId}, candidate ID ${candidateId}`);
      
      // Step 1: Resolve blockchain election ID
      let targetElectionId = electionId;
      const dbBlockchainId = await fetchBlockchainElectionId();
      
      if (dbBlockchainId && dbBlockchainId > 0) {
        // Use blockchain ID from database if available
        targetElectionId = dbBlockchainId;
        console.log(`Using database-stored blockchain election ID: ${targetElectionId}`);
      }
      
      // Verify this election ID exists on chain
      const electionExists = await verifyElectionExists(targetElectionId);
      
      if (!electionExists && dbBlockchainId !== electionId) {
        // Try the original election ID as fallback
        console.log(`Election ${targetElectionId} not found, trying original ID ${electionId}...`);
        const originalExists = await verifyElectionExists(electionId);
        
        if (originalExists) {
          targetElectionId = electionId;
          console.log(`Using original election ID ${targetElectionId} as fallback`);
        } else {
          // Neither ID works, try scanning for a valid ID (last resort)
          console.log("Both election IDs invalid, scanning for valid IDs...");
          
          // Try a range of IDs near the target
          const rangeStart = Math.max(1, targetElectionId - 5);
          const rangeEnd = targetElectionId + 5;
          
          for (let id = rangeStart; id <= rangeEnd; id++) {
            if (id === targetElectionId || id === electionId) continue; // Skip already tried IDs
            
            try {
              const exists = await verifyElectionExists(id);
              if (exists) {
                console.log(`Found valid election ID ${id} through scanning`);
                targetElectionId = id;
                
                // Save this mapping for future use
                try {
                  await apiRequest('/api/elections/update-blockchain-id', {
                    method: 'POST',
                    body: {
                      electionId,
                      blockchainId: id
                    }
                  });
                  console.log(`Updated election ${electionId} with blockchain ID ${id}`);
                } catch (saveErr) {
                  console.warn('Failed to save blockchain ID to database:', saveErr);
                }
                
                break;
              }
            } catch (scanErr) {
              // Continue trying other IDs
            }
          }
        }
      }
      
      if (!await verifyElectionExists(targetElectionId)) {
        throw new Error(`Could not find a valid election on the blockchain (tried IDs: ${electionId}, ${dbBlockchainId})`);
      }
      
      console.log(`Using final election ID for voting: ${targetElectionId}`);
      
      // Step 2: Resolve blockchain candidate ID
      let targetCandidateId = candidateId;
      const blockchainCandidateId = await resolveCandidateBlockchainId();
      
      if (blockchainCandidateId && blockchainCandidateId > 0) {
        targetCandidateId = blockchainCandidateId;
        console.log(`Using blockchain candidate ID: ${targetCandidateId}`);
      }
      
      // Step 3: Cast the vote
      console.log(`Voting for election ${targetElectionId}, candidate ${targetCandidateId}`);
      
      const voteResult = await voteForSenator(targetElectionId, targetCandidateId);
      
      if (voteResult.success) {
        toast({
          title: "Vote Successful",
          description: `You have successfully voted for ${candidateName}`,
        });
        
        setHasVoted(true);
        setVoteCount(voteResult.voteCount || null);
        
        // Verify the vote was recorded
        setIsVerifyingVote(true);
        
        try {
          // Wait a moment for the blockchain to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Then verify if the vote was recorded
          const voteCounted = await checkIfVoted();
          
          if (!voteCounted) {
            console.warn("Vote verification failed - vote may not have been recorded correctly");
            toast({
              variant: "destructive",
              title: "Vote Verification Failed",
              description: "Your vote may not have been properly recorded. Please check your voting status.",
            });
          } else {
            console.log("Vote successfully verified!");
          }
        } catch (verifyError) {
          console.error("Error verifying vote:", verifyError);
        } finally {
          setIsVerifyingVote(false);
        }
        
        if (onSuccess) onSuccess();
      } else {
        throw new Error("Vote failed: Transaction was not successful");
      }
      
    } catch (error: any) {
      console.error('Vote failed:', error);
      
      toast({
        variant: "destructive",
        title: "Vote Failed",
        description: error.message || "Failed to submit your vote",
      });
      
      if (onError) onError(error);
    } finally {
      setIsVoting(false);
    }
  };
  
  // Check if user has already voted when the component mounts
  useEffect(() => {
    if (isWalletConnected) {
      checkIfVoted();
    }
    
    // Try to resolve blockchain IDs when component mounts
    fetchBlockchainElectionId();
    resolveCandidateBlockchainId();
  }, [isWalletConnected, walletAddress, electionId, candidateId]);
  
  return (
    <Button
      onClick={handleVote}
      disabled={disabled || isVoting || isVerifyingVote || hasVoted}
      className={className}
      variant={hasVoted ? "outline" : "default"}
    >
      {isVoting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Voting...
        </>
      ) : isVerifyingVote ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : hasVoted ? (
        <>
          <CheckCircle className="mr-2 h-4 w-4" />
          Voted
        </>
      ) : (
        "Vote"
      )}
    </Button>
  );
}