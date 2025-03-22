import { Election, Candidate, ElectionCandidate, getFacultyName } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { CalendarIcon, Clock, Users, UserCircle, Award, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ElectionCandidatesList } from "./election-candidates-list-improved";

interface ElectionDetailViewProps {
  election: Election;
}

interface CandidateWithVotes extends Candidate {
  voteCount: number;
}

export function ElectionDetailView({ election }: ElectionDetailViewProps) {
  const { toast } = useToast();
  const [votedCandidates, setVotedCandidates] = useState<{[key: number]: boolean}>({});
  const [isVoting, setIsVoting] = useState<{[key: number]: boolean}>({});

  // Check if the election is active (for enabling/disabling voting)
  const isElectionActive = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    return now >= startDate && now <= endDate;
  };

  // Helper function to format dates
  function formatDate(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status badge for election
  const getStatusBadge = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
  };

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
      <Card className="mt-4">
        <CardContent className="p-8 text-center">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No candidates found for this election.</p>
        </CardContent>
      </Card>
    );
  }

  // Combine election candidates with their full details and simulate vote counts
  const combinedCandidates: CandidateWithVotes[] = electionCandidates
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

  // Add a voting simulation function
  const castVote = async (candidateId: number) => {
    setIsVoting(prev => ({ ...prev, [candidateId]: true }));
    
    try {
      // This will be replaced with actual blockchain integration
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Show message about future blockchain implementation
      toast({
        title: "Blockchain Voting Coming Soon",
        description: "The voting logic will be implemented with blockchain integration in the future. Thank you for testing!",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Voting Logic Not Implemented",
        description: "The blockchain-based voting system is still under development.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(prev => ({ ...prev, [candidateId]: false }));
    }
  };

  // Group candidates by position for President/VP elections
  const candidatesByPosition: Record<string, CandidateWithVotes[]> = {};
  
  // Check if this is a President/VP election
  const isPresidentVPElection = election.position === "President/VP";
  
  if (isPresidentVPElection) {
    combinedCandidates.forEach(candidate => {
      if (!candidatesByPosition[candidate.position]) {
        candidatesByPosition[candidate.position] = [];
      }
      candidatesByPosition[candidate.position].push(candidate);
    });
  }

  return (
    <div className="space-y-6">
      {/* Election Details Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{election.name}</h2>
              <p className="text-purple-100 mt-1">{election.position}</p>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Eligible Faculties</p>
                <p className="text-sm font-medium">
                  {election.eligibleFaculties.includes("all") 
                    ? "All Faculties" 
                    : election.eligibleFaculties.map(f => getFacultyName(f)).join(", ")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm font-medium">{formatDate(election.startDate)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-sm font-medium">{formatDate(election.endDate)}</p>
              </div>
            </div>
          </div>
          
          {election.description && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h3 className="text-md font-medium mb-2">Description</h3>
              <p className="text-gray-700">{election.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {new Date(election.startDate) > new Date() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">This election has not started yet</p>
            <p className="text-sm">Voting will be available once the election starts on {formatDate(election.startDate)}</p>
          </div>
        </div>
      )}
      
      {new Date(election.endDate) < new Date() && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          <div>
            <p className="font-medium">This election has ended</p>
            <p className="text-sm">Voting closed on {formatDate(election.endDate)}</p>
          </div>
        </div>
      )}

      {/* Candidates Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-purple-700 to-purple-500 bg-clip-text text-transparent">
          Election Candidates
        </h3>
        
        {/* Using the improved candidate list component */}
        <ElectionCandidatesList election={election} />
      </div>
    </div>
  );
}