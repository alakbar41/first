import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/use-web3';
import { ElectionStatus, ElectionType } from '@/lib/improved-web3-service';
import { getElectionDetails as getBlockchainElection, checkIfVoted } from '@/lib/improved-blockchain-integration';
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
    isWalletConnected 
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
        // Get data from blockchain and merge with external data from our DB
        const blockchainElection = await getBlockchainElection(electionId);
        
        // Get election data from API to get the name and faculties
        const response = await fetch(`/api/elections/${electionId}`);
        const dbElection = await response.json();
        
        // Merge the data
        setElection({
          ...blockchainElection,
          name: dbElection.name,
          eligibleFaculties: dbElection.eligibleFaculties || 'SITE,SB,SPIA,SESD'
        });
      } catch (error) {
        console.error('Failed to fetch election details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchElection();
  }, [isInitialized, electionId]);

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
  }, [isInitialized, isWalletConnected, electionId]);

  // Helper function to format timestamp to date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Helper function to get status badge
  const getStatusBadge = (status: ElectionStatus) => {
    switch (status) {
      case ElectionStatus.Pending:
        return (
          <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 rounded-full px-3 py-1 text-xs font-medium flex items-center">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1 animate-pulse"></div>
            Pending
          </div>
        );
      case ElectionStatus.Active:
        return (
          <div className="bg-green-100 border border-green-200 text-green-800 rounded-full px-3 py-1 text-xs font-medium flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></div>
            Active
          </div>
        );
      case ElectionStatus.Completed:
        return (
          <div className="bg-blue-100 border border-blue-200 text-blue-800 rounded-full px-3 py-1 text-xs font-medium flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            Completed
          </div>
        );
      case ElectionStatus.Cancelled:
        return (
          <div className="bg-red-100 border border-red-200 text-red-800 rounded-full px-3 py-1 text-xs font-medium flex items-center">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
            Cancelled
          </div>
        );
      default:
        return (
          <div className="bg-gray-100 border border-gray-200 text-gray-800 rounded-full px-3 py-1 text-xs font-medium flex items-center">
            <div className="w-2 h-2 rounded-full bg-gray-500 mr-1"></div>
            Unknown
          </div>
        );
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
      <Card className={`${className} overflow-hidden shadow-md`}>
        <div className="bg-gradient-to-r from-purple-700 to-purple-600 p-6">
          <Skeleton className="h-7 w-48 bg-purple-400/30" />
          <Skeleton className="h-4 w-32 bg-purple-400/20 mt-2" />
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
          
          <Skeleton className="h-px w-full" />
          
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
          
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (!election) {
    return (
      <Card className={`${className} overflow-hidden shadow-md`}>
        <div className="bg-gray-50 p-6 border-b">
          <div className="flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-center mt-4 text-gray-700">
            Blockchain Election Not Found
          </h3>
        </div>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-gray-500">
              The election with ID <span className="font-medium">{electionId}</span> could not be found on the blockchain.
            </p>
            <p className="text-sm text-gray-400">
              This could be because the election hasn't been registered on the blockchain yet, 
              or there might be a connection issue with the blockchain network.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300`}>
      <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600 text-white pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <div>
            <CardTitle className="text-xl font-bold text-white">{election.name}</CardTitle>
            <p className="text-purple-100 mt-1">
              {getElectionType(election.electionType)}
            </p>
          </div>
          <div>
            {getStatusBadge(election.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Start Date</p>
              <p className="text-sm font-bold">{formatDate(election.startTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">End Date</p>
              <p className="text-sm font-bold">{formatDate(election.endTime)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Votes</p>
              <p className="text-sm font-bold">{election.totalVotesCast}</p>
            </div>
          </div>
        </div>
        
        <Separator className="my-2" />
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Eligible Faculties</h4>
          <div className="flex flex-wrap gap-2">
            {election.eligibleFaculties.split(',').map((faculty, index) => (
              <Badge key={index} variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                {faculty.trim()}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="pt-4">
          {!isWalletConnected ? (
            <ConnectWalletButton variant="default" className="w-full font-medium" />
          ) : isCheckingVote ? (
            <Button disabled variant="outline" className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking vote status...
            </Button>
          ) : hasVoted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
              <div className="bg-green-100 rounded-full p-1 mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-green-800">
                You have successfully voted in this election
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800">
                Connect your wallet and vote for candidates below
              </p>
            </div>
          )}
        </div>
        
        {election.resultsFinalized && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium text-blue-800">
                Results have been finalized on the blockchain
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}