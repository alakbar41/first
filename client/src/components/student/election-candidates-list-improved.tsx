import { useQuery } from "@tanstack/react-query";
import { Candidate, Election, ElectionCandidate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { UserCircle, Award, Check, Info, Clock, Calendar, AlertTriangle } from "lucide-react";
import { getFacultyName } from "@shared/schema";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

  // Combine election candidates with their full details and simulate vote counts
  let combinedCandidates: CandidateWithVotes[] = electionCandidates
    .map(ec => {
      const fullCandidate = candidatesData?.find(c => c.id === ec.candidateId);
      if (!fullCandidate) return null;
      
      // Simulate vote count (placeholder for blockchain data)
      const voteCount = Math.floor(Math.random() * 100); // This will be replaced with actual blockchain data
      
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
  
  // Add a voting simulation function
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
    const hasVoted = Object.keys(votedCandidates).length > 0;
    
    if (hasVoted) {
      toast({
        title: "Already Voted",
        description: "You have already cast your vote in this election. Each student can only vote once per election.",
        variant: "destructive",
      });
      return;
    }
    
    setIsVoting(prev => ({ ...prev, [candidateId]: true }));
    
    try {
      // This would be replaced with blockchain integration
      // For now, we'll simulate a server call with a delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Record the vote
      setVotedCandidates(prev => ({ ...prev, [candidateId]: true }));
      
      toast({
        title: "Blockchain Voting Coming Soon",
        description: "The voting functionality will be implemented with blockchain integration in the future. Your test vote has been recorded for this demo.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Voting Error",
        description: "There was an error processing your vote. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(prev => ({ ...prev, [candidateId]: false }));
    }
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
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                  {ticketVoted ? (
                    <Button disabled className="bg-green-500 hover:bg-green-600 shadow-md">
                      <Check className="mr-2 h-4 w-4" />
                      Voted Successfully
                    </Button>
                  ) : (
                    <Button 
                      disabled={ticketVoting || !isElectionActive()}
                      onClick={() => castVote(president.id)} 
                      className={`${isElectionActive() 
                        ? "bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-800 hover:to-purple-700 shadow-md" 
                        : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
                    >
                      {ticketVoting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Processing vote...
                        </>
                      ) : !isElectionActive() ? (
                        <>Voting not available</>
                      ) : (
                        <>
                          Vote for {president.fullName} {runningMate ? `& ${runningMate.fullName}` : ''}
                        </>
                      )}
                    </Button>
                  )}
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
                    
                    <div className="mt-4">
                      {isVoted ? (
                        <Button disabled className="w-full bg-green-500 hover:bg-green-600 shadow-md">
                          <Check className="mr-2 h-4 w-4" />
                          Voted Successfully
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => castVote(candidate.id)}
                          disabled={isProcessingVote || !isElectionActive()}
                          className={`w-full ${isElectionActive() 
                            ? "bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-800 hover:to-purple-700 shadow-md" 
                            : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
                        >
                          {isProcessingVote ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              Processing vote...
                            </>
                          ) : !isElectionActive() ? (
                            <>Voting not available</>
                          ) : (
                            <>Vote for {candidate.fullName}</>
                          )}
                        </Button>
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