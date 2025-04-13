import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/use-web3';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import studentIdWeb3Service from '@/lib/student-id-web3-service';

interface EnhancedCandidateVoteCountProps {
  candidateId: number;
  electionId?: number; // Optional election ID to help with mapping to blockchain
  showLabel?: boolean;
  className?: string;
  onRegisterRefresh?: (candidateId: number, refreshFn: () => void) => void;
}

export function EnhancedCandidateVoteCount({ 
  candidateId,
  electionId = 0, // Default to 0 if not provided
  showLabel = true,
  className = "",
  onRegisterRefresh
}: EnhancedCandidateVoteCountProps) {
  const { isInitialized } = useWeb3();
  
  const [isLoading, setIsLoading] = useState(true);
  const [voteCount, setVoteCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [blockchainId, setBlockchainId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh the vote count
  const refreshVoteCount = () => {
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
        
        // First, fetch the candidate details to get the student ID
        const candidateResponse = await apiRequest('GET', `/api/candidates/${candidateId}`);
        
        if (!candidateResponse.ok) {
          throw new Error(`Failed to fetch candidate ${candidateId} details`);
        }
        
        const candidate = await candidateResponse.json();
        const candidateStudentId = candidate.studentId;
        
        if (!candidateStudentId) {
          throw new Error(`Candidate ${candidateId} has no student ID`);
        }
        
        setStudentId(candidateStudentId);
        
        // Use the student ID to look up the blockchain candidate ID
        let blockchainCandidateId: number;
        
        try {
          blockchainCandidateId = await studentIdWeb3Service.getCandidateIdByStudentId(candidateStudentId);
          setBlockchainId(blockchainCandidateId);
          console.log(`Mapped candidate with student ID ${candidateStudentId} to blockchain ID ${blockchainCandidateId} for vote count`);
        } catch (mappingError) {
          console.warn('Error mapping candidate by student ID, trying alternative approach:', mappingError);
          setError("Student ID mapping failed");
          
          // If we can't map by student ID, we'll try a position-based approach as fallback
          // This is only for transition period, should be removed once all candidates have student IDs
          const electionCandidatesResponse = await apiRequest('GET', `/api/elections/${electionId}/candidates`);
          
          if (!electionCandidatesResponse.ok) {
            throw new Error(`Failed to fetch candidates for election ${electionId}`);
          }
          
          const electionCandidates = await electionCandidatesResponse.json();
          const position = electionCandidates.findIndex((ec: any) => ec.candidateId === candidateId);
          
          if (position === -1) {
            throw new Error(`Candidate ${candidateId} not found in election ${electionId}`);
          }
          
          // Blockchain IDs are 1-based, so add 1 to the position
          blockchainCandidateId = position + 1;
          setBlockchainId(blockchainCandidateId);
          setError("Using position-based fallback");
        }
        
        // Use the mapped ID to get the vote count
        const count = await studentIdWeb3Service.getCandidateVoteCount(blockchainCandidateId);
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
  }, [isInitialized, candidateId, electionId, refreshKey]);

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
            <p>Student ID: {studentId || 'Unknown'}</p>
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