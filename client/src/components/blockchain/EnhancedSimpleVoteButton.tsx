import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { voteForCandidateEnhanced, voteForTicketEnhanced, mapElectionFromWeb2ToWeb3, mapCandidateFromWeb2ToWeb3 } from '@/lib/enhanced-blockchain-id-mapping';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import { Loader2 } from 'lucide-react';

interface EnhancedSimpleVoteButtonProps {
  electionId: number;
  candidateId?: number;
  ticketId?: number;
  onVoteSuccess?: () => void;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export function EnhancedSimpleVoteButton({ 
  electionId, 
  candidateId, 
  ticketId,
  onVoteSuccess,
  className = '',
  compact = false,
  variant = 'default'
}: EnhancedSimpleVoteButtonProps) {
  const { toast } = useToast();
  const { isInitialized, walletAddress, connectWallet } = useStudentIdWeb3();
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [blockchainElectionId, setBlockchainElectionId] = useState<number | null>(null);
  const [blockchainCandidateId, setBlockchainCandidateId] = useState<number | null>(null);
  const [blockchainTicketId, setBlockchainTicketId] = useState<number | null>(null);
  const [electionDetails, setElectionDetails] = useState<any>(null);
  const [candidateDetails, setCandidateDetails] = useState<any>(null);

  // Load election and candidate details when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch election details to get the start timestamp
        const electionResponse = await apiRequest('GET', `/api/elections/${electionId}`);
        if (electionResponse.ok) {
          const election = await electionResponse.json();
          setElectionDetails(election);
        }

        // Fetch candidate details if candidateId is provided
        if (candidateId) {
          const candidateResponse = await apiRequest('GET', `/api/candidates/${candidateId}`);
          if (candidateResponse.ok) {
            const candidate = await candidateResponse.json();
            setCandidateDetails(candidate);
          }
        }

        // Map the Web2 IDs to Web3 IDs using our new approach
        const web3ElectionId = await mapElectionFromWeb2ToWeb3(electionId);
        setBlockchainElectionId(web3ElectionId);
        
        if (candidateId) {
          const web3CandidateId = await mapCandidateFromWeb2ToWeb3(candidateId);
          setBlockchainCandidateId(web3CandidateId);
        }
      } catch (error) {
        console.error('Failed to load election or candidate details:', error);
      }
    };

    loadData();
  }, [electionId, candidateId]);

  // Ensure only one of candidateId or ticketId is provided
  if (candidateId && ticketId) {
    console.error('EnhancedSimpleVoteButton: Only one of candidateId or ticketId should be provided');
  }
  
  if (!candidateId && !ticketId) {
    console.error('EnhancedSimpleVoteButton: Either candidateId or ticketId must be provided');
  }

  const handleVote = async () => {
    try {
      setIsVoting(true);
      
      // Check if already voted
      const votedResponse = await apiRequest('GET', `/api/elections/${electionId}/user-voted`);
      if (votedResponse.ok) {
        const votedData = await votedResponse.json();
        if (votedData.hasVoted) {
          toast({
            title: "Already Voted",
            description: "You have already voted in this election.",
            variant: "destructive"
          });
          setHasVoted(true);
          setIsVoting(false);
          return;
        }
      }
      
      // Check if wallet connected, if not try to connect
      if (!walletAddress) {
        console.log('No wallet connected, attempting to connect...');
        try {
          await connectWallet();
        } catch (error: any) {
          toast({
            title: 'Wallet Connection Failed',
            description: error.message || 'Could not connect to your wallet. Please make sure MetaMask is installed and unlocked.',
            variant: 'destructive'
          });
          setIsVoting(false);
          return;
        }
      }
      
      // Log the mapping details for debugging
      if (electionDetails && candidateDetails) {
        console.log(`Voting for election ID: ${electionId} candidate ID: ${candidateId} with student ID: ${candidateDetails.studentId}`);
        console.log(`Database election ID: ${electionId} Blockchain election ID: ${blockchainElectionId}`);
        console.log(`Database candidate ID: ${candidateId} Blockchain candidate ID: ${blockchainCandidateId}`);
      }
      
      // Get voting token before proceeding
      const tokenResponse = await apiRequest('POST', '/api/voting-tokens', { electionId });
      if (!tokenResponse.ok) {
        throw new Error('Failed to generate voting token');
      }
      
      const tokenData = await tokenResponse.json();
      const votingToken = tokenData.token;
      
      // Verify the token is valid
      const verifyResponse = await apiRequest('POST', '/api/voting-tokens/verify', { 
        token: votingToken, 
        electionId
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Invalid voting token');
      }
      
      // Vote based on whether we have a candidateId or ticketId
      let success = false;
      if (candidateId && blockchainElectionId !== null && blockchainCandidateId !== null) {
        // Use the blockchain IDs for voting
        success = await voteForCandidateEnhanced(electionId, candidateId);
      } else if (ticketId && blockchainElectionId !== null && blockchainTicketId !== null) {
        success = await voteForTicketEnhanced(electionId, ticketId);
      } else {
        throw new Error('Could not map Web2 IDs to blockchain IDs');
      }
      
      if (success) {
        // Mark the token as used
        await apiRequest('POST', '/api/voting-tokens/use', { 
          token: votingToken, 
          electionId, 
          candidateId, 
          ticketId 
        });
        
        toast({
          title: "Vote Successful!",
          description: "Your vote has been recorded on the blockchain.",
        });
        
        setHasVoted(true);
        if (onVoteSuccess) onVoteSuccess();
      }
    } catch (error: any) {
      console.error('Vote failed:', error);
      
      let errorMessage = error.message || 'An unknown error occurred';
      // Extract MetaMask/Ethers error message if available
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      toast({
        title: "Vote Failed",
        description: `${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  if (!isInitialized) {
    return (
      <Button 
        variant="outline" 
        className={className}
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }
  
  if (hasVoted) {
    return (
      <Button
        variant="outline"
        className={`${className} bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800`}
        disabled
      >
        {compact ? "Voted" : "Vote Recorded"}
      </Button>
    );
  }
  
  return (
    <Button
      variant={variant}
      className={className}
      disabled={isVoting}
      onClick={handleVote}
    >
      {isVoting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {compact ? "Voting..." : "Recording Vote..."}
        </>
      ) : (
        compact ? "Vote" : "Cast Your Vote"
      )}
    </Button>
  );
}