import { useState, useEffect } from 'react';
import { useWeb3, ElectionStatus, ElectionType } from '@/hooks/use-web3';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Calendar, Users, Clock } from "lucide-react";
import { ConnectWalletButton } from './ConnectWalletButton';

interface BlockchainElectionDetailsProps {
  electionId: number;
  className?: string;
}

export function BlockchainElectionDetails({ 
  electionId,
  className = ""
}: BlockchainElectionDetailsProps) {
  const { 
    isInitialized, 
    isWalletConnected, 
    getElectionDetails, 
    checkIfVoted 
  } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [isCheckingVote, setIsCheckingVote] = useState(false);
  const [election, setElection] = useState<{
    id: number;
    name: string;
    electionType: ElectionType;
    status: ElectionStatus;
    startTime: number;
    endTime: number;
    eligibleFaculties: string;
    totalVotesCast: number;
    resultsFinalized: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isInitialized) return;
    
    const fetchElection = async () => {
      setIsLoading(true);
      try {
        const electionData = await getElectionDetails(electionId);
        setElection(electionData);
      } catch (error) {
        console.error('Failed to fetch election details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchElection();
  }, [isInitialized, electionId, getElectionDetails]);

  useEffect(() => {
    if (!isInitialized || !isWalletConnected) return;
    
    const checkVoteStatus = async () => {
      setIsCheckingVote(true);
      try {
        const voted = await checkIfVoted(electionId);
        setHasVoted(voted);
      } catch (error) {
        console.error('Failed to check vote status:', error);
      } finally {
        setIsCheckingVote(false);
      }
    };

    checkVoteStatus();
  }, [isInitialized, isWalletConnected, electionId, checkIfVoted]);

  // Helper function to format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Helper function to get status badge
  const getStatusBadge = (status: ElectionStatus) => {
    switch (status) {
      case ElectionStatus.Pending:
        return <Badge variant="outline">Pending</Badge>;
      case ElectionStatus.Active:
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case ElectionStatus.Completed:
        return <Badge variant="secondary">Completed</Badge>;
      case ElectionStatus.Cancelled:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Helper function to get election type
  const getElectionType = (type: ElectionType) => {
    switch (type) {
      case ElectionType.Senator:
        return "Senator Election";
      case ElectionType.PresidentVP:
        return "President/VP Election";
      default:
        return "Unknown Election Type";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!election) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Blockchain Election Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The election with ID {electionId} could not be found on the blockchain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{election.name}</CardTitle>
          {getStatusBadge(election.status)}
        </div>
        <p className="text-sm text-muted-foreground">
          {getElectionType(election.electionType)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm">
          <Calendar className="mr-2 h-4 w-4" />
          <div>
            <span className="font-semibold">Start:</span> {formatDate(election.startTime)}
          </div>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="mr-2 h-4 w-4" />
          <div>
            <span className="font-semibold">End:</span> {formatDate(election.endTime)}
          </div>
        </div>
        <div className="flex items-center text-sm">
          <Users className="mr-2 h-4 w-4" />
          <div>
            <span className="font-semibold">Total Votes Cast:</span> {election.totalVotesCast}
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Eligible Faculties:</p>
          <div className="flex flex-wrap gap-2">
            {election.eligibleFaculties.split(',').map((faculty, index) => (
              <Badge key={index} variant="outline">{faculty.trim()}</Badge>
            ))}
          </div>
        </div>
        
        <div className="pt-2">
          {!isWalletConnected ? (
            <ConnectWalletButton variant="outline" className="w-full" />
          ) : isCheckingVote ? (
            <Button disabled variant="outline" className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking vote status...
            </Button>
          ) : hasVoted ? (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              You have voted in this election
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect your wallet and vote for candidates below
            </p>
          )}
        </div>
        
        {election.resultsFinalized && (
          <div className="mt-4 p-2 bg-primary/10 rounded-md text-sm">
            <p className="font-semibold">Results have been finalized on the blockchain.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}