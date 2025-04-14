import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/use-web3';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Loader2 } from "lucide-react";
import { getBlockchainCandidateId, clearCandidateCache } from "@/lib/blockchain-id-mapping";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CandidateVoteCountProps {
  candidateId: number;
  electionId?: number; // Optional election ID to help with mapping to blockchain
  showLabel?: boolean;
  className?: string;
  onRegisterRefresh?: (candidateId: number, refreshFn: () => void) => void;
}

export function CandidateVoteCount({ 
  candidateId,
  electionId = 0, // Default to 0 if not provided
  showLabel = true,
  className = "",
  onRegisterRefresh
}: CandidateVoteCountProps) {
  const { isInitialized, getCandidateVoteCount } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(true);
  const [voteCount, setVoteCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [blockchainId, setBlockchainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh the vote count
  const refreshVoteCount = () => {
    // Clear the candidate cache to force a refresh of the mapping
    clearCandidateCache(candidateId);
    setError(null);
    setBlockchainId(null);
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
      setError(null);
      
      try {
        // Skip trying to get vote count if election ID is 0 (invalid)
        if (electionId === 0) {
          setError("Invalid election ID");
          setVoteCount(null);
          setIsLoading(false);
          return;
        }
        
        // Use the ID mapping service to get the correct blockchain candidate ID
        let blockchainCandidateId: number;
        
        try {
          // Use the provided election ID for mapping if available
          blockchainCandidateId = await getBlockchainCandidateId(electionId, candidateId);
          setBlockchainId(blockchainCandidateId);
          console.log(`Mapped candidate ID ${candidateId} in election ${electionId} to blockchain ID ${blockchainCandidateId} for vote count`);
        } catch (mappingError) {
          console.error('Error mapping candidate ID to blockchain:', mappingError);
          setBlockchainId(null);
          setError("Failed to map candidate ID");
          setVoteCount(null);
          setIsLoading(false);
          return;
        }
        
        // Use the mapped ID to get the vote count
        const count = await getCandidateVoteCount(blockchainCandidateId);
        setVoteCount(count);
      } catch (error: any) {
        console.error(`Failed to fetch vote count for candidate ${candidateId}:`, error);
        setVoteCount(null);
        setError(error?.message || "Failed to fetch votes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoteCount();
  }, [isInitialized, candidateId, electionId, getCandidateVoteCount, refreshKey]);

  if (isLoading) {
    return (
      <Skeleton className="h-5 w-12" />
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`flex items-center ${className} cursor-pointer`}
            onClick={refreshVoteCount}
          >
            {showLabel && <span className="mr-1">Votes:</span>}
            <span className="font-bold">{voteCount !== null ? voteCount : '0'}</span>
            {error && <Info className="ml-1 h-3 w-3" />}
            {isLoading && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-bold">Candidate Details:</p>
            <p>DB ID: {candidateId}</p>
            <p>Blockchain ID: {blockchainId || 'Unknown'}</p>
            <p>Election ID: {electionId}</p>
            {error && <p className="text-red-500">{error}</p>}
            <p className="text-xs font-bold mt-1">Click to refresh</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}