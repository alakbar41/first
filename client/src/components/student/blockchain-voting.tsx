import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Check, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { 
  getElectionFromBlockchain,
  getCandidateVotes,
  voteForCandidate,
  hasUserVoted,
  studentIdToBytes32
} from '@/lib/blockchain';
import { Progress } from '@/components/ui/progress';

interface BlockchainVotingProps {
  election: any;
  candidates: any[];
}

export function BlockchainVoting({ election, candidates }: BlockchainVotingProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState<{[key: string]: number}>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [userHasWallet, setUserHasWallet] = useState(false);
  
  // Check if user has MetaMask installed
  useEffect(() => {
    const checkMetaMask = async () => {
      setUserHasWallet(typeof window !== 'undefined' && window.ethereum !== undefined);
    };
    
    checkMetaMask();
  }, []);
  
  // Load blockchain data
  useEffect(() => {
    const loadBlockchainData = async () => {
      if (!election?.blockchainId) {
        setError('This election has not been deployed to the blockchain yet.');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Check if user has already voted
        const voted = await hasUserVoted(election.blockchainId);
        setHasVoted(voted);
        
        // Get vote counts for all candidates
        const candidateVotes = await getCandidateVotes(election.blockchainId);
        
        // Convert to dictionary for easier lookup
        const votesMap: {[key: string]: number} = {};
        let voteSum = 0;
        
        candidateVotes.forEach(cv => {
          votesMap[cv.studentId] = cv.voteCount;
          voteSum += cv.voteCount;
        });
        
        setVoteCounts(votesMap);
        setTotalVotes(voteSum);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading blockchain data:', err);
        setError(err.message || 'Failed to load blockchain voting data');
        setIsLoading(false);
      }
    };
    
    loadBlockchainData();
  }, [election]);
  
  // Handle voting
  const handleVote = async (studentId: string) => {
    if (!election?.blockchainId) {
      toast({
        title: 'Error',
        description: 'This election is not available for blockchain voting.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setIsVoting(true);
      console.log(`Attempting to vote for candidate with student ID: ${studentId}`);
      console.log(`Election blockchain ID: ${election.blockchainId}`);
      console.log(`Candidate hash: ${studentIdToBytes32(studentId)}`);
      
      // Call blockchain to cast vote
      // The voteForCandidate function already notifies the backend about the vote
      const success = await voteForCandidate(election.blockchainId, studentIdToBytes32(studentId));
      console.log(`Vote result: ${success ? 'successful' : 'failed'}`);
      
      // Update UI
      setHasVoted(true);
      toast({
        title: 'Vote Cast Successfully',
        description: 'Your vote has been securely recorded on the blockchain. A confirmation email with your transaction details has been sent to your registered email address.',
        variant: 'default'
      });
      
      // Refresh vote counts
      const candidateVotes = await getCandidateVotes(election.blockchainId);
      const votesMap: {[key: string]: number} = {};
      let voteSum = 0;
      
      candidateVotes.forEach(cv => {
        votesMap[cv.studentId] = cv.voteCount;
        voteSum += cv.voteCount;
      });
      
      setVoteCounts(votesMap);
      setTotalVotes(voteSum);
    } catch (err: any) {
      console.error('Error voting:', err);
      toast({
        title: 'Error Casting Vote',
        description: err.message || 'Failed to cast vote. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6 flex justify-center items-center flex-col min-h-[200px]">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-2" />
          <p className="text-sm text-muted-foreground">Loading blockchain data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  // If no MetaMask, show install prompt
  if (!userHasWallet) {
    return (
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertTitle>MetaMask Required</AlertTitle>
        <AlertDescription>
          <p className="mb-2">To vote in blockchain elections, you need to install the MetaMask wallet extension.</p>
          <Button 
            variant="outline" 
            onClick={() => window.open('https://metamask.io/download/', '_blank')}
          >
            Install MetaMask
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Show results if completed or user has voted
  const isCompleted = election.status === 'completed';
  const shouldShowResults = isCompleted || hasVoted;
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Blockchain Voting</CardTitle>
        <CardDescription>
          {isCompleted ? 'Final election results from the blockchain' : 
           hasVoted ? 'You have already voted in this election' : 
           'Cast your vote securely on the blockchain'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {shouldShowResults ? (
          // Show election results
          <div className="space-y-4">
            {hasVoted && !isCompleted && (
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Vote Recorded</AlertTitle>
                <AlertDescription>
                  Your vote has been securely recorded on the blockchain. For privacy and transparency, 
                  only the blockchain contains your actual vote choice.
                </AlertDescription>
              </Alert>
            )}
            
            <p className="text-sm font-medium mb-4">Total Votes: {totalVotes}</p>
            
            {candidates.map(candidate => {
              const votes = voteCounts[candidate.studentId] || 0;
              const percentage = totalVotes > 0 ? (votes / totalVotes * 100).toFixed(1) : '0';
              
              return (
                <div key={candidate.id} className="space-y-1 py-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{candidate.fullName}</p>
                      <p className="text-sm text-muted-foreground">{candidate.studentId}</p>
                    </div>
                    <div className="font-medium">{votes} votes ({percentage}%)</div>
                  </div>
                  <Progress value={parseFloat(percentage)} className="h-2" />
                </div>
              );
            })}
          </div>
        ) : (
          // Show voting interface
          <div className="space-y-4">
            <p className="text-sm mb-4">
              Select a candidate to cast your vote on the blockchain. This action cannot be undone.
              For transparency and privacy, your actual vote choice will only be stored on the blockchain, 
              not in our database.
            </p>
            
            {candidates.map(candidate => (
              <div 
                key={candidate.id} 
                className="border rounded-lg p-4 flex justify-between items-center hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{candidate.fullName}</p>
                  <p className="text-sm text-muted-foreground">{candidate.studentId}</p>
                </div>
                <Button
                  onClick={() => handleVote(candidate.studentId)}
                  disabled={isVoting}
                >
                  {isVoting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Vote
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}