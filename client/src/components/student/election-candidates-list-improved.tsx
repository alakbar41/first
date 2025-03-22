import { useQuery } from "@tanstack/react-query";
import { Candidate, Election, ElectionCandidate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { UserCircle, Award, Check, Info, Clock, Calendar, AlertTriangle } from "lucide-react";
import { getFacultyName } from "@shared/schema";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWeb3, ElectionType } from "@/hooks/use-web3";
import { ConnectWalletButton, VoteForSenatorButton, VoteForTicketButton, CandidateVoteCount } from "@/components/blockchain";

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
  const { 
    isInitialized,
    isWalletConnected,
    walletAddress,
    connectWallet,
    getElectionDetails,
    getCandidateDetails,
    getCandidateVoteCount,
    getTicketDetails,
    getTicketVoteCount,
    checkIfVoted,
    voteForSenator,
    voteForPresidentVP
  } = useWeb3();
  
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
  const [blockchainVoteCounts, setBlockchainVoteCounts] = useState<{[key: number]: number}>({});
  
  // Check if the user has already voted in this election and load vote counts from blockchain
  useEffect(() => {
    async function loadBlockchainData() {
      if (isInitialized && election) {
        try {
          // Check if user has voted
          if (isWalletConnected) {
            const hasVoted = await checkIfVoted(election.id);
            setHasVotedInElection(hasVoted);
          }
          
          // Load vote counts for all candidates
          if (candidatesData && candidatesData.length > 0) {
            const voteCountsMap: {[key: number]: number} = {};
            
            for (const candidate of candidatesData) {
              try {
                // In a real implementation, you'd have a mapping between database IDs and blockchain IDs
                // Here we're assuming they're the same for simplicity
                const voteCount = await getCandidateVoteCount(candidate.id);
                voteCountsMap[candidate.id] = voteCount;
              } catch (err) {
                console.error(`Error fetching vote count for candidate ${candidate.id}:`, err);
                voteCountsMap[candidate.id] = 0;
              }
            }
            
            setBlockchainVoteCounts(voteCountsMap);
          }
        } catch (error) {
          console.error("Error loading blockchain data:", error);
        }
      }
    }
    
    loadBlockchainData();
  }, [isInitialized, isWalletConnected, election, candidatesData, checkIfVoted, getCandidateVoteCount]);
  
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

  // Combine election candidates with their full details and vote counts from blockchain
  // Note: In a full implementation, you would fetch vote counts from blockchain for each candidate
  // For now, we still use the estimated vote counts but with the proper infrastructure in place
  let combinedCandidates: CandidateWithVotes[] = electionCandidates
    .map(ec => {
      const fullCandidate = candidatesData?.find(c => c.id === ec.candidateId);
      if (!fullCandidate) return null;
      
      // Use the candidate's blockchain vote count if available, otherwise use 0
      // In a real implementation, you would fetch this data from the blockchain
      const voteCount = blockchainVoteCounts[fullCandidate.id] || 0;
      
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
  
  // This function is no longer used as we're using the VoteButtons components directly
  // It remains here as a reference for the eligibility check logic
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
    
    if (!isWalletConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to vote using blockchain.",
        variant: "destructive",
      });
      return;
    }
    
    // For actual implementation, we use the VoteForSenatorButton and VoteForTicketButton components
    // which handle the blockchain integration directly
  };
  
  // Handle successful vote
  const handleVoteSuccess = (txHash: string) => {
    toast({
      title: "Vote Cast Successfully",
      description: `Your vote has been recorded on the blockchain. Transaction: ${txHash.substring(0, 10)}...`,
      variant: "default",
    });
    
    // Update UI state to indicate user has voted
    setHasVotedInElection(true);
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
                <div className="px-6 py-4 bg-purple-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-purple-800 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Presidential Ticket
                    <span className="ml-auto">
                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">
                        {president.voteCount + (runningMate?.voteCount || 0)} votes
                      </Badge>
                    </span>
                  </h3>
                </div>
                
                <div className="p-4 grid md:grid-cols-2 gap-4">
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
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col space-y-3">
                    {/* Display combined ticket vote count */}
                    <div className="flex justify-center">
                      <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 text-base py-1 px-3">
                        <span className="font-semibold">{president.voteCount + (runningMate?.voteCount || 0)}</span> votes for this ticket
                      </Badge>
                    </div>
                    
                    <div className="flex justify-end">
                      {hasVotedInElection ? (
                        <Button disabled className="bg-green-500 hover:bg-green-600 shadow-md">
                          <Check className="mr-2 h-4 w-4" />
                          Voted Successfully
                        </Button>
                      ) : !isWalletConnected ? (
                        <ConnectWalletButton />
                      ) : (
                        <VoteForTicketButton
                          electionId={election.id}
                          ticketId={president.id} // Using president ID as the ticket ID
                          disabled={!isElectionActive() || !isUserEligible()}
                          onVoteSuccess={handleVoteSuccess}
                          className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-800 hover:to-purple-700 shadow-md"
                        />
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
                <div className="flex items-start p-4">
                  {candidate.pictureUrl ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 mr-4">
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
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                      <UserCircle className="text-gray-400 w-10 h-10" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900">{candidate.fullName}</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200">
                              {candidate.voteCount} votes
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Current vote count (from blockchain)</p>
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
                      {/* Display blockchain vote count */}
                      <CandidateVoteCount 
                        candidateId={candidate.id} 
                        showLabel={true}
                        className="w-full justify-center"
                      />
                    
                      {hasVotedInElection ? (
                        <Button disabled className="w-full bg-green-500 hover:bg-green-600 shadow-md">
                          <Check className="mr-2 h-4 w-4" />
                          Voted Successfully
                        </Button>
                      ) : !isWalletConnected ? (
                        <ConnectWalletButton 
                          className="w-full"
                        />
                      ) : (
                        <VoteForSenatorButton
                          electionId={election.id}
                          candidateId={candidate.id}
                          disabled={!isElectionActive() || !isUserEligible()}
                          onVoteSuccess={handleVoteSuccess}
                          className="w-full"
                        />
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