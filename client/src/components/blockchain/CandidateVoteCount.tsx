import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/use-web3';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface CandidateVoteCountProps {
  candidateId: number;
  showLabel?: boolean;
  className?: string;
  onRegisterRefresh?: (candidateId: number, refreshFn: () => void) => void;
}

export function CandidateVoteCount({ 
  candidateId,
  showLabel = true,
  className = "",
  onRegisterRefresh
}: CandidateVoteCountProps) {
  const { isInitialized, getCandidateVoteCount } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(true);
  const [voteCount, setVoteCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh the vote count
  const refreshVoteCount = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  // Register the refresh function with the parent component if needed
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(candidateId, refreshVoteCount);
    }
  }, [candidateId, onRegisterRefresh]);
  
  useEffect(() => {
    if (!isInitialized) return;
    
    const fetchVoteCount = async () => {
      setIsLoading(true);
      try {
        const count = await getCandidateVoteCount(candidateId);
        setVoteCount(count);
      } catch (error) {
        console.error(`Failed to fetch vote count for candidate ${candidateId}:`, error);
        setVoteCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoteCount();
  }, [isInitialized, candidateId, getCandidateVoteCount, refreshKey]);

  if (isLoading) {
    return (
      <Skeleton className="h-5 w-12" />
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center ${className}`}
      onClick={refreshVoteCount}
    >
      {showLabel && <span className="mr-1">Votes:</span>}
      <span className="font-bold">{voteCount !== null ? voteCount : 'N/A'}</span>
      {isLoading && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
    </Badge>
  );
}