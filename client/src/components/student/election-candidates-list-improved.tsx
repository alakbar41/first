import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Candidate, Election, ElectionCandidate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { UserCircle, Award, Check, Info, Clock, Calendar, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { getFacultyName } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
// Removed missing import that was causing build error

interface ElectionCandidatesListProps {
  election: Election;
}

interface CandidateWithVotes extends Candidate {
  voteCount: number;
  runningMate?: CandidateWithVotes; // Add reference to running mate
}

export function ElectionCandidatesList({ election }: ElectionCandidatesListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if the election is active (for enabling/disabling voting)
  const isElectionActive = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    return now >= startDate && now <= endDate;
  };
  
  const [votedCandidates, setVotedCandidates] = useState<{[key: number]: boolean}>({});
  const [isVoting, setIsVoting] = useState<{[key: number]: boolean}>({});
  const [hasVotedInElection, setHasVotedInElection] = useState(false);
  const [voteCounts, setVoteCounts] = useState<{[key: number]: number}>({});
  // State to store blockchain vote counts
  const [blockchainVoteCounts, setBlockchainVoteCounts] = useState<{ [studentId: string]: number }>({});
  // State to track if we're loading blockchain vote counts
  const [isLoadingBlockchainVotes, setIsLoadingBlockchainVotes] = useState(false);
  
  // Fetch candidates for this election
  const { data: electionCandidates, isLoading: isLoadingElectionCandidates } = useQuery<ElectionCandidate[]>({
    queryKey: [`/api/elections/${election.id}/candidates`],
    queryFn: async () => {
      const response = await fetch(`/api/elections/${election.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
  });

  // Fetch full candidate details
  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: !!electionCandidates,
  });

  // Check if the user has already voted in this election
  useEffect(() => {
    async function checkVotingStatus() {
      if (user && election) {
        try {
          // Check with the server if user has already voted in this election
          const response = await fetch(`/api/elections/${election.id}/user-voted`);
          if (response.ok) {
            const data = await response.json();
            if (data.hasVoted) {
              setHasVotedInElection(true);
            }
          }
        } catch (error) {
          console.error("Error checking database vote status:", error);
        }
      }
    }
    
    checkVotingStatus();
  }, [election, user]);
  
  // Load vote counts for candidates from database and blockchain (if applicable)
  useEffect(() => {
    // Only run if we have candidates data
    if (!candidatesData || candidatesData.length === 0 || !election) {
      return;
    }
    
    async function loadVoteCounts() {
      try {
        // First load vote counts from database (will be used for non-blockchain elections)
        try {
          const response = await fetch(`/api/elections/${election.id}/vote-counts`);
          if (response.ok) {
            // Check if the response is empty first
            const text = await response.text();
            if (!text || text.trim() === '') {
              console.log('Vote counts response was empty');
              setVoteCounts({});
            } else {
              // Then parse the JSON if we have content
              try {
                const voteCounts = JSON.parse(text);
                const voteCountsMap: {[key: number]: number} = {};
                
                // Map vote counts to candidate IDs
                if (Array.isArray(voteCounts)) {
                  voteCounts.forEach((vc: {candidateId: number, count: number}) => {
                    voteCountsMap[vc.candidateId] = vc.count;
                  });
                }
                
                setVoteCounts(voteCountsMap);
              } catch (jsonError) {
                console.error('Error parsing vote counts JSON:', jsonError);
                console.log('Raw response:', text.substring(0, 100) + '...');
                setVoteCounts({});
              }
            }
          } else {
            console.error(`Failed to fetch vote counts: ${response.status} ${response.statusText}`);
            setVoteCounts({});
          }
        } catch (fetchError) {
          console.error('Error fetching vote counts:', fetchError);
          setVoteCounts({});
        }
        
        // If the election is on blockchain, load vote counts from there as well
        if (election.blockchainId) {
          setIsLoadingBlockchainVotes(true);
          try {
            // Use the blockchain ID directly which contains the correct timestamp
            const blockchainTimestamp = parseInt(election.blockchainId);
            console.log(`Using blockchain ID as timestamp: ${blockchainTimestamp}`);
            
            // For debug comparison - also log the calculated timestamp
            const calculatedTimestamp = Math.floor(new Date(election.startDate).getTime() / 1000);
            console.log(`Calculated timestamp from startDate (not used): ${calculatedTimestamp}`);
            
            try {
              // Import blockchain functions 
              const { getCandidateVoteCount, getAllCandidatesWithVotes, studentIdToBytes32 } = await import('@/lib/blockchain');
              
              // Create a map to store blockchain vote counts
              const blockchainCounts: {[studentId: string]: number} = {};
              
              // First try to get all candidates and vote counts at once (more efficient)
              try {
                console.log(`Getting all candidates with votes for timestamp ${blockchainTimestamp}`);
                const allCandidatesWithVotes = await getAllCandidatesWithVotes(blockchainTimestamp);
                console.log(`Received all candidates with votes:`, allCandidatesWithVotes);
                
                // If this succeeds, we can process all candidates at once
                if (candidatesData && allCandidatesWithVotes.ids.length > 0) {
                  // Map blockchain hashes back to student IDs for each candidate
                  candidatesData.forEach(candidate => {
                    if (candidate.studentId) {
                      // For debugging, log student ID and its hash
                      const hash = studentIdToBytes32(candidate.studentId);
                      console.log(`Candidate ${candidate.fullName} ID: ${candidate.studentId}, Hash: ${hash}`);
                      
                      // Find the index of this candidate's hash in the result
                      const index = allCandidatesWithVotes.ids.findIndex(id => 
                        id.toLowerCase() === hash.toLowerCase());
                      
                      // If found, get the vote count
                      if (index !== -1) {
                        blockchainCounts[candidate.studentId] = allCandidatesWithVotes.voteCounts[index];
                        console.log(`Found vote count for ${candidate.studentId}: ${blockchainCounts[candidate.studentId]}`);
                      }
                    }
                  });
                }
              } catch (batchError) {
                console.warn("Could not get all candidates in batch, falling back to individual queries:", batchError);
                
                // Fall back to individual queries
                if (candidatesData) {
                  for (const candidate of candidatesData) {
                    try {
                      if (!candidate.studentId) continue;
                      const voteCount = await getCandidateVoteCount(blockchainTimestamp, candidate.studentId);
                      blockchainCounts[candidate.studentId] = voteCount;
                      console.log(`Blockchain vote count for ${candidate.studentId}: ${voteCount}`);
                    } catch (e) {
                      console.warn(`Could not get blockchain vote count for ${candidate.studentId}:`, e);
                    }
                  }
                }
              }
              
              // Set the state with the vote counts
              console.log('Final blockchain vote counts:', blockchainCounts);
              setBlockchainVoteCounts(blockchainCounts);
            } catch (importError) {
              console.error('Failed to import blockchain functions:', importError);
            }
          } catch (blockchainError) {
            console.error("Error fetching blockchain vote counts:", blockchainError);
          } finally {
            setIsLoadingBlockchainVotes(false);
          }
        }
      } catch (error) {
        console.error("Error loading vote count data:", error);
      }
    }
    
    loadVoteCounts();
  }, [election, candidatesData, election.blockchainId]);

  const isLoading = isLoadingElectionCandidates || isLoadingCandidates;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  if (!electionCandidates || electionCandidates.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg border border-gray-200 shadow-sm text-center">
        <p className="text-gray-500">No candidates found for this election.</p>
      </div>
    );
  }

  // Combine election candidates with their full details and vote counts
  // For blockchain elections, use vote counts from blockchain, otherwise use database
  let combinedCandidates: CandidateWithVotes[] = electionCandidates
    .map(ec => {
      const fullCandidate = candidatesData?.find(c => c.id === ec.candidateId);
      if (!fullCandidate) return null;
      
      let voteCount = 0;
      
      // For blockchain elections, use the blockchain vote count if available
      if (election.blockchainId && blockchainVoteCounts[fullCandidate.studentId] !== undefined) {
        voteCount = blockchainVoteCounts[fullCandidate.studentId];
        console.log(`Using blockchain vote count for ${fullCandidate.fullName}: ${voteCount}`);
      } else {
        // Otherwise use the vote count from the database
        voteCount = voteCounts[fullCandidate.id] || 0;
      }
      
      return {
        ...fullCandidate,
        voteCount,
      };
    })
    .filter((c): c is CandidateWithVotes => c !== null)
    .sort((a, b) => b.voteCount - a.voteCount); // Sort by vote count (highest first)

  // Process running mates for President/VP election
  const isPresidentVPElection = election.position === "President/VP";
  
  let presidentVPPairs: CandidateWithVotes[] = [];
  let regularCandidates: CandidateWithVotes[] = [];
  
  if (isPresidentVPElection) {
    // Separate presidents and VPs
    const presidents = combinedCandidates.filter(c => c.position === "President");
    const vps = combinedCandidates.filter(c => c.position === "Vice President");
    
    // Get the actual election-candidate entries to find running mate relationships
    const electionCandidateEntries = electionCandidates || [];
    
    // For each president, find a matching VP based on the runningMateId in the election-candidate entries
    presidents.forEach(president => {
      // Find the corresponding election-candidate entry for this president
      const presidentEntry = electionCandidateEntries.find(ec => ec.candidateId === president.id);
      
      // Find the VP who is registered as a running mate for this president
      let runningMate: CandidateWithVotes | undefined = undefined;
      
      if (presidentEntry && presidentEntry.runningMateId) {
        // Look for the VP candidate with matching ID
        runningMate = vps.find(vp => vp.id === presidentEntry.runningMateId);
      } else if (vps.length > 0) {
        // Fallback to the first available VP if no explicit relationship is found
        runningMate = vps[0];
        // Remove this VP from the available pool
        vps.splice(0, 1);
      }
      
      if (runningMate) {
        // Create president-VP pair
        presidentVPPairs.push({
          ...president,
          runningMate
        });
      } else {
        // If no VP available, just show the president
        presidentVPPairs.push(president);
      }
    });
    
    // Any VP candidates not assigned as running mates should be shown separately
    regularCandidates = vps.filter(vp => 
      !presidentVPPairs.some(pair => pair.runningMate && pair.runningMate.id === vp.id)
    );
  } else {
    // For senator elections, just show all candidates normally
    regularCandidates = combinedCandidates;
  }
  
  // Function to check if user is eligible to vote in this election
  const isUserEligible = () => {
    if (!user) return false;
    
    // For President/VP elections, all students are eligible
    if (isPresidentVPElection) return true;
    
    // For Senator elections, check if student's faculty matches the election's eligibleFaculties
    if (election.position === "Senator") {
      // If eligibleFaculties includes "all", all students can vote
      if (election.eligibleFaculties.includes("all")) return true;
      
      // Otherwise, student's faculty must be in the eligibleFaculties list
      return election.eligibleFaculties.includes(user.faculty);
    }
    
    return true; // Default to true for other election types
  };
  
  // Function to cast a vote
  const castVote = async (candidateId: number) => {
    // Check faculty eligibility for Senator elections
    if (!isUserEligible()) {
      toast({
        title: "Not Eligible to Vote",
        description: `This election is only for students from ${election.eligibleFaculties.map(f => getFacultyName(f)).join(", ")}. You are from ${getFacultyName(user?.faculty || "")}.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if user has already voted in this election
    if (hasVotedInElection) {
      toast({
        title: "Already Voted",
        description: "You have already cast your vote in this election. Each student can only vote once per election.",
        variant: "destructive",
      });
      return;
    }
    
    // Set loading state for this candidate
    setIsVoting(prev => ({ ...prev, [candidateId]: true }));
    
    try {
      // Find the full candidate object to get the studentId which is needed for blockchain
      const candidate = candidatesData?.find(c => c.id === candidateId);
      if (!candidate) {
        throw new Error("Candidate details not found");
      }
      
      if (election.blockchainId) {
        // For blockchain-enabled elections, use the blockchain voting method
        try {
          // Use the blockchain ID directly as the timestamp instead of calculating from start date
          const blockchainTimestamp = parseInt(election.blockchainId);
          console.log(`Using blockchain ID directly for voting: ${blockchainTimestamp}`);
          
          // Import the blockchain voting function dynamically
          const { voteForCandidate, studentIdToBytes32 } = await import('@/lib/blockchain');
          
          // Convert student ID to bytes32 hash format for the blockchain
          const candidateHash = studentIdToBytes32(candidate.studentId);
          
          console.log(`Voting for candidate ${candidate.fullName} (${candidate.studentId}) with hash ${candidateHash} in election ${blockchainTimestamp}`);
          
          // Call blockchain to cast vote
          await voteForCandidate(blockchainTimestamp, candidateHash);
          
          // After successful blockchain vote, update UI
          setVotedCandidates(prev => ({ ...prev, [candidateId]: true }));
          setHasVotedInElection(true);
          
          // Import the vote count function
          const { getCandidateVoteCount } = await import('@/lib/blockchain');
          
          // Refresh blockchain vote counts immediately after voting
          const refreshVoteCounts = async () => {
            try {
              // Wait a moment for the blockchain to update
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Get updated vote count for the voted candidate
              const updatedVoteCount = await getCandidateVoteCount(blockchainTimestamp, candidate.studentId);
              console.log(`Updated blockchain vote count for ${candidate.studentId}: ${updatedVoteCount}`);
              
              // Also refresh all candidate vote counts for consistency
              const newBlockchainCounts: {[studentId: string]: number} = {
                ...blockchainVoteCounts,
                [candidate.studentId]: updatedVoteCount
              };
              
              // We'll only refresh the voted candidate's count since the others 
              // might not be registered in this blockchain election
              console.log(`Only refreshing vote count for the candidate that was voted for (${candidate.studentId}).`);
              console.log(`Skipping refresh for other candidates to avoid "Candidate not found" errors.`);
              
              // Update all vote counts in state
              setBlockchainVoteCounts(newBlockchainCounts);
            } catch (refreshError) {
              console.error("Error refreshing vote counts:", refreshError);
            }
          };
          
          // Start the refresh process
          refreshVoteCounts();
          
          toast({
            title: "Vote Cast Successfully on Blockchain",
            description: "Your vote has been securely recorded on the blockchain.",
            variant: "default",
          });
        } catch (blockchainError: any) {
          console.error("Blockchain voting error:", blockchainError);
          
          if (blockchainError.message?.includes("MetaMask not detected")) {
            toast({
              title: "MetaMask Required",
              description: "To vote in blockchain elections, you need to install the MetaMask wallet extension.",
              variant: "destructive",
            });
          } else if (blockchainError.message?.includes("user rejected") || blockchainError.message?.includes("cancelled")) {
            toast({
              title: "Transaction Cancelled",
              description: "You cancelled the voting transaction in MetaMask.",
              variant: "destructive",
            });
          } else if (blockchainError.message?.includes("Already voted")) {
            toast({
              title: "Already Voted",
              description: "You have already voted in this election on the blockchain.",
              variant: "destructive",
            });
            // Update UI to reflect that user has voted
            setHasVotedInElection(true);
          } else if (blockchainError.message?.includes("Internal JSON-RPC error") || 
                    blockchainError.message?.includes("coalesce error") || 
                    blockchainError.code === -32603) {
            toast({
              title: "MetaMask Network Error",
              description: "There was a network issue with your MetaMask transaction. This could be due to network congestion or MetaMask configuration. Please try again in a few moments, or try resetting your MetaMask account.",
              variant: "destructive",
            });
            console.error("Detailed error from MetaMask:", blockchainError);
          } else if (blockchainError.message?.includes("gas")) {
            toast({
              title: "Transaction Gas Error",
              description: "Not enough gas or gas estimation failed. Please try again with higher gas limits in MetaMask.",
              variant: "destructive",
            });
          } else if (blockchainError.message?.includes("nonce")) {
            toast({
              title: "Transaction Nonce Error",
              description: "There was an issue with your account nonce. Try resetting your MetaMask account in Settings > Advanced > Reset Account.",
              variant: "destructive",
            });
          } else if (blockchainError.message?.includes("balance")) {
            toast({
              title: "Insufficient Balance",
              description: "Not enough funds for gas. Please add more ETH to your wallet.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Blockchain Voting Error",
              description: blockchainError.message || "An error occurred while trying to cast your vote on the blockchain.",
              variant: "destructive",
            });
          }
          throw blockchainError; // Re-throw for the outer catch block
        }
      } else {
        // For regular database elections, use the original method
        const response = await apiRequest('POST', `/api/elections/${election.id}/vote`, {
          candidateId: candidateId
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Update UI state to indicate user has voted
          setVotedCandidates(prev => ({ ...prev, [candidateId]: true }));
          setHasVotedInElection(true);
          
          toast({
            title: "Vote Cast Successfully",
            description: "Your vote has been recorded successfully.",
            variant: "default",
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to cast vote");
        }
      }
      
      // Refresh vote counts regardless of voting method
      queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}/vote-counts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}/candidates`] });
    } catch (error) {
      // This will catch both blockchain and regular voting errors
      if (!(error instanceof Error && error.message.includes("user rejected"))) {
        toast({
          title: "Error Casting Vote",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      // Clear loading state
      setIsVoting(prev => ({ ...prev, [candidateId]: false }));
    }
  };
  
  // Create a reference to all CandidateVoteCount components for refreshing
  const candidateVoteCountRefs = useRef<{[key: number]: () => void}>({});
  
  // Register a refresh function for a candidate
  const registerVoteCountRefresh = (candidateId: number, refreshFn: () => void) => {
    candidateVoteCountRefs.current[candidateId] = refreshFn;
  };
  
  // Handle successful vote with enhanced response
  const handleVoteSuccess = (confirmationId: string, voteCount?: number) => {
    toast({
      title: "Vote Cast Successfully",
      description: voteCount !== undefined
        ? `Your vote has been recorded successfully. The candidate now has ${voteCount} votes.`
        : `Your vote has been recorded successfully.`,
      variant: "default",
    });
    
    // Update UI state to indicate user has voted
    setHasVotedInElection(true);
    
    // Record this vote in the database if needed
    try {
      apiRequest('POST', `/api/elections/${election.id}/record-vote`, {})
        .catch(err => console.warn("Failed to record vote in database:", err));
    } catch (error) {
      console.warn("Error recording vote in database:", error);
    }
    
    // Refresh the UI with updated vote counts
    
    // Stage 1: Immediate refresh (visual feedback)
    console.log("Immediate vote count refresh");
    Object.values(candidateVoteCountRefs.current).forEach(refreshFn => {
      if (typeof refreshFn === 'function') refreshFn();
    });
    
    // Also force re-fetch of the candidate list to refresh all data
    queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}/candidates`] });
  };
  
  // Handle successful vote reset
  const handleResetSuccess = () => {
    // Update UI state to indicate user can vote again
    setHasVotedInElection(false);
    
    // Refresh vote counts for all candidates
    Object.values(candidateVoteCountRefs.current).forEach(refreshFn => {
      if (typeof refreshFn === 'function') refreshFn();
    });
    
    // Also force re-fetch of the candidate list to refresh all data
    queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}/candidates`] });
  };

  // Get appropriate status message for display
  const getElectionStatusMessage = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    
    if (now < startDate) {
      return (
        <div className="flex items-center text-sm text-blue-600 mt-2">
          <Clock className="mr-1 h-4 w-4" />
          This election hasn't started yet. Voting will begin on {startDate.toLocaleDateString()}.
        </div>
      );
    } else if (now > endDate) {
      return (
        <div className="flex items-center text-sm text-gray-600 mt-2">
          <Calendar className="mr-1 h-4 w-4" />
          This election has ended. Results are being finalized.
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-sm text-green-600 mt-2">
        <Check className="mr-1 h-4 w-4" />
        This election is active. You can vote now.
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* We removed the status message here as it's already shown in the parent component */}
      
      {isPresidentVPElection && presidentVPPairs.length > 0 ? (
        // President/VP paired display
        <div className="grid grid-cols-1 gap-6">
          {presidentVPPairs.map(president => {
            const runningMate = president.runningMate;
            const ticketVoted = votedCandidates[president.id] || (runningMate && votedCandidates[runningMate.id]);
            const ticketVoting = isVoting[president.id] || (runningMate && isVoting[runningMate.id]);
            
            return (
              <div 
                key={`ticket-${president.id}-${runningMate?.id || 'no-vp'}`}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-3 sm:py-4 bg-purple-50 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-purple-800 flex items-center">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">Presidential Ticket</span>
                    <span className="ml-auto">
                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-xs sm:text-sm whitespace-nowrap">
                        {president.voteCount + (runningMate?.voteCount || 0)} votes
                      </Badge>
                    </span>
                  </h3>
                </div>
                
                <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {/* President */}
                  <div className="flex items-start space-x-4">
                    {president.pictureUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                        <img 
                          src={president.pictureUrl} 
                          alt={president.fullName} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircle className="text-gray-400 w-10 h-10" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{president.fullName}</h4>
                      <p className="text-sm text-gray-500">President Candidate</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-600">Faculty: {getFacultyName(president.faculty)}</p>
                        <p className="text-sm text-gray-600">Student ID: {president.studentId}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Vice President - only show if there is a running mate */}
                  {runningMate && (
                    <div className="flex items-start space-x-4">
                      {runningMate.pictureUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src={runningMate.pictureUrl} 
                            alt={runningMate.fullName} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserCircle className="text-gray-400 w-10 h-10" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{runningMate.fullName}</h4>
                        <p className="text-sm text-gray-500">Vice President Candidate</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">Faculty: {getFacultyName(runningMate.faculty)}</p>
                          <p className="text-sm text-gray-600">Student ID: {runningMate.studentId}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col space-y-3">
                    {/* Display combined ticket vote count */}
                    <div className="flex justify-center">
                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-xs sm:text-base py-1 px-2 sm:px-3">
                        <span className="font-semibold">{president.voteCount + (runningMate?.voteCount || 0)}</span> votes for this ticket
                      </Badge>
                    </div>
                    
                    <div className="flex justify-center sm:justify-end gap-2">
                      {hasVotedInElection ? (
                        <>
                          <Button disabled className="w-full sm:w-auto bg-green-500 hover:bg-green-600 shadow-md text-xs sm:text-sm">
                            <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            Voted Successfully
                          </Button>
                          <Button 
                            onClick={() => {
                              toast({
                                title: "Reset Vote",
                                description: "The vote reset feature has been disabled in this version.",
                                variant: "default",
                              });
                            }}
                            className="text-xs sm:text-sm bg-gray-500 hover:bg-gray-600"
                          >
                            Reset Vote
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              toast({
                                title: "Coming Soon",
                                description: "Voting functionality will be implemented in the future. Thank you for your patience.",
                                variant: "default",
                              });
                            }}
                            className="w-full sm:w-auto bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-800 hover:to-purple-700 shadow-md"
                          >
                            Vote for this Ticket
                          </Button>
                          
                          {/* Add debug information */}
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Election active: {isElectionActive() ? 'Yes' : 'No'}</p>
                            <p>User eligible: {isUserEligible() ? 'Yes' : 'No'}</p>
                            <p>Already voted: {hasVotedInElection ? 'Yes' : 'No'}</p>
                            <p>Timestamp ID: {Math.floor(new Date(election.startDate).getTime() / 1000)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Regular candidates list for Senator elections or remaining candidates
        <div className="grid grid-cols-1 gap-4">
          {regularCandidates.map(candidate => {
            const isVoted = votedCandidates[candidate.id];
            const isProcessingVote = isVoting[candidate.id];
            
            return (
              <div 
                key={candidate.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start p-3 sm:p-4">
                  {candidate.pictureUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 mb-3 sm:mb-0 sm:mr-4">
                      <img 
                        src={candidate.pictureUrl} 
                        alt={candidate.fullName} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mb-3 sm:mb-0 sm:mr-4">
                      <UserCircle className="text-gray-400 w-10 h-10" />
                    </div>
                  )}
                  
                  <div className="flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                      <h4 className="font-medium text-gray-900">{candidate.fullName}</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="hidden sm:inline-flex mt-1 sm:mt-0 text-purple-700 bg-purple-50 border-purple-200 text-xs">
                              {candidate.voteCount} votes
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Current vote count</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <p className="text-sm text-gray-500">{candidate.position}</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-sm text-gray-600">Faculty: {getFacultyName(candidate.faculty)}</p>
                      <p className="text-sm text-gray-600">Student ID: {candidate.studentId}</p>
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      {/* Display vote count for mobile */}
                      <div className="sm:hidden flex justify-center">
                        <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-xs px-2 py-1">
                          {candidate.voteCount} votes
                        </Badge>
                      </div>
                      
                      {/* Display vote count */}
                      <div className="flex items-center justify-center bg-gray-50 p-2 rounded-md">
                        <span className="text-sm font-medium text-gray-700">{candidate.voteCount} votes</span>
                      </div>
                    
                      {hasVotedInElection ? (
                        <div className="flex flex-col sm:flex-row w-full gap-2">
                          <Button disabled className="w-full bg-green-500 hover:bg-green-600 shadow-md text-xs sm:text-sm">
                            <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            Voted Successfully
                          </Button>
                          <Button 
                            onClick={() => {
                              toast({
                                title: "Reset Vote",
                                description: "The vote reset feature has been disabled in this version.",
                                variant: "default",
                              });
                            }}
                            className="text-xs sm:text-sm bg-gray-500 hover:bg-gray-600"
                          >
                            Reset Vote
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Vote button - now active with blockchain voting */}
                          <Button
                            onClick={() => {
                              // Ensure election is active and user is eligible before proceeding
                              if (!isElectionActive()) {
                                toast({
                                  title: "Election Not Active",
                                  description: "This election is not currently active. Please check back during the voting period.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              if (!isUserEligible()) {
                                toast({
                                  title: "Not Eligible to Vote",
                                  description: `This election is only for students from ${election.eligibleFaculties.map(f => getFacultyName(f)).join(", ")}. You are from ${getFacultyName(user?.faculty || "")}.`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              // Proceed with vote
                              castVote(candidate.id);
                            }}
                            disabled={isProcessingVote || !isElectionActive() || !isUserEligible() || hasVotedInElection}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            size="lg"
                          >
                            {isProcessingVote ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Vote for this Candidate"
                            )}
                          </Button>
                          
                          {/* Add debug information */}
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Election active: {isElectionActive() ? 'Yes' : 'No'}</p>
                            <p>User eligible: {isUserEligible() ? 'Yes' : 'No'}</p>
                            <p>Already voted: {hasVotedInElection ? 'Yes' : 'No'}</p>
                            <p>Timestamp ID: {Math.floor(new Date(election.startDate).getTime() / 1000)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}