import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Candidate, Election, ElectionCandidate, getFacultyName } from "@shared/schema";
import { ChartBarIcon, ListOrderedIcon, Award, UserCircle, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Interface for candidate with votes
interface CandidateWithVotes extends Candidate {
  voteCount: number;
  percentage: number;
  runningMate?: CandidateWithVotes; // For president/VP elections
}

export default function Results() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  
  // Fetch completed elections
  const { data: pastElections, isLoading: isLoadingElections } = useQuery<Election[]>({
    queryKey: ["/api/elections/past"],
    queryFn: async () => {
      // Simulate fetching past elections by filtering client-side
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      const elections = await response.json();
      return elections.filter((election: Election) => 
        new Date(election.endDate) < new Date()
      );
    },
  });

  if (!user) {
    navigate("/auth");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Admin users should be redirected to their dashboard
  if (user.isAdmin) {
    navigate("/admin");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to admin dashboard...</p>
      </div>
    );
  }

  // Get the selected election
  const selectedElection = selectedElectionId 
    ? pastElections?.find(e => e.id.toString() === selectedElectionId)
    : pastElections?.[0];
    
  // Fetch candidates for the selected election
  const { data: electionCandidates, isLoading: isLoadingCandidates } = useQuery<ElectionCandidate[]>({
    queryKey: ["/api/elections/candidates", selectedElection?.id],
    queryFn: async () => {
      if (!selectedElection) return [];
      const response = await fetch(`/api/elections/${selectedElection.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: !!selectedElection,
  });
  
  // Fetch all candidates' details
  const { data: candidatesData, isLoading: isLoadingCandidatesData } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: !!electionCandidates && electionCandidates.length > 0,
  });
  
  // Combine election candidates with their details and add vote counts
  const candidatesWithVotes: CandidateWithVotes[] = useMemo(() => {
    if (!electionCandidates || !candidatesData) return [];
    
    // First pass: create candidates with vote counts
    const candidates = electionCandidates.map(ec => {
      const fullCandidate = candidatesData.find(c => c.id === ec.candidateId);
      if (!fullCandidate) return null;
      
      // Simulated vote count (replace with blockchain data in the future)
      const voteCount = Math.floor(Math.random() * 100);
      
      return {
        ...fullCandidate,
        voteCount,
        percentage: 0, // Will calculate after getting total
      };
    }).filter((c): c is CandidateWithVotes => c !== null);
    
    // Calculate percentages
    const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
    
    if (totalVotes > 0) {
      candidates.forEach(c => {
        c.percentage = Math.round((c.voteCount / totalVotes) * 100);
      });
    }
    
    // Sort by vote count (highest first)
    return candidates.sort((a, b) => b.voteCount - a.voteCount);
  }, [electionCandidates, candidatesData]);
  
  // Identify President/VP pairs for President/VP elections
  const isPresidentVPElection = selectedElection?.position === "President/VP";
  
  const candidatePairs = useMemo(() => {
    if (!isPresidentVPElection || !candidatesWithVotes.length) return [];
    
    const presidents = candidatesWithVotes.filter(c => c.position === "President");
    const vps = candidatesWithVotes.filter(c => c.position === "Vice President");
    
    return presidents.map(president => {
      // Simulate matching (in a real app we would have an actual relationship)
      const vp = vps.length > 0 ? vps[0] : undefined;
      if (vp) {
        vps.splice(0, 1); // Remove to prevent re-use
      }
      
      return {
        ...president,
        runningMate: vp,
      };
    });
  }, [isPresidentVPElection, candidatesWithVotes]);
  
  const isLoading = isLoadingElections || isLoadingCandidates || isLoadingCandidatesData;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Election Results</h1>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
            </div>
          ) : pastElections && pastElections.length > 0 ? (
            <div className="space-y-6">
              {/* Election selector */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Election
                </label>
                <Select 
                  value={selectedElectionId || pastElections[0]?.id.toString()} 
                  onValueChange={setSelectedElectionId}
                >
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue placeholder="Choose an election..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pastElections.map(election => (
                      <SelectItem key={election.id} value={election.id.toString()}>
                        {election.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedElection ? (
                <Tabs defaultValue="charts" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="charts" className="flex items-center">
                      <ChartBarIcon className="mr-2 h-4 w-4" />
                      Charts
                    </TabsTrigger>
                    <TabsTrigger value="table" className="flex items-center">
                      <ListOrderedIcon className="mr-2 h-4 w-4" />
                      Detailed Results
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="charts" className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {selectedElection.name} - Results Visualization
                      </h2>
                      
                      <div className="h-80 bg-white rounded-md border border-gray-200 p-4">
                        {candidatesWithVotes && candidatesWithVotes.length > 0 ? (
                          isPresidentVPElection && candidatePairs.length > 0 ? (
                            // President/VP election results visualization
                            <div className="h-full flex flex-col justify-center space-y-6">
                              {candidatePairs.map((candidate, index) => (
                                <div key={candidate.id} className="flex items-center space-x-4">
                                  <div className="w-8 text-right text-gray-600 text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="w-16 flex-shrink-0">
                                    {candidate.pictureUrl ? (
                                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-100">
                                        <img 
                                          src={candidate.pictureUrl} 
                                          alt={candidate.fullName} 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <UserCircle className="text-gray-400 w-8 h-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-grow">
                                    <div className="flex items-center mb-1">
                                      <div className="text-sm font-medium text-gray-900 mr-2">
                                        {candidate.fullName}
                                        {index === 0 && <span className="text-yellow-500 ml-1">👑</span>}
                                      </div>
                                      {candidate.runningMate && (
                                        <Badge variant="outline" className="border-purple-300 text-purple-600 text-xs">
                                          with {candidate.runningMate.fullName}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div 
                                        className={`h-full flex items-center rounded-full pl-2 ${
                                          index === 0 ? "bg-purple-600" : 
                                          index === 1 ? "bg-purple-400" : 
                                          "bg-purple-300"
                                        }`}
                                        style={{ width: `${candidate.percentage}%` }}
                                      >
                                        <span className="text-xs font-medium text-white">
                                          {candidate.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                      <span>0</span>
                                      <span>{candidate.voteCount} votes</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // Standard election results visualization
                            <div className="h-full flex flex-col justify-center space-y-4">
                              {candidatesWithVotes.map((candidate, index) => (
                                <div key={candidate.id} className="flex items-center space-x-4">
                                  <div className="w-8 text-right text-gray-600 text-sm font-medium">
                                    {index + 1}
                                  </div>
                                  <div className="w-16 flex-shrink-0">
                                    {candidate.pictureUrl ? (
                                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-100">
                                        <img 
                                          src={candidate.pictureUrl} 
                                          alt={candidate.fullName} 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                        <UserCircle className="text-gray-400 w-8 h-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-grow">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {candidate.fullName}
                                      {index === 0 && <span className="text-yellow-500 ml-1">👑</span>}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div 
                                        className={`h-full flex items-center rounded-full pl-2 ${
                                          index === 0 ? "bg-purple-600" : 
                                          index === 1 ? "bg-purple-400" : 
                                          "bg-purple-300"
                                        }`}
                                        style={{ width: `${candidate.percentage}%` }}
                                      >
                                        <span className="text-xs font-medium text-white">
                                          {candidate.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                      <span>0</span>
                                      <span>{candidate.voteCount} votes</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <div className="text-center p-4">
                              <ChartBarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                              <p className="text-gray-500">
                                No voting results available for this election yet.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="table" className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {selectedElection.name} - Detailed Results
                      </h2>
                      
                      <div className="overflow-hidden border border-gray-200 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Candidate
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Position
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Faculty
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Votes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {candidatesWithVotes && candidatesWithVotes.length > 0 ? (
                              isPresidentVPElection && candidatePairs.length > 0 ? (
                                // Display President/VP pairs
                                candidatePairs.map((candidate, index) => (
                                  <tr key={candidate.id} className={index === 0 ? "bg-purple-50" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                          index === 0 ? "bg-purple-600 text-white" : 
                                          index === 1 ? "bg-purple-400 text-white" : 
                                          index === 2 ? "bg-purple-300 text-white" : "bg-gray-200 text-gray-700"
                                        }`}>
                                          {index === 0 ? <Trophy className="h-4 w-4" /> : (index + 1)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <div className="text-sm font-medium text-gray-900 flex items-center">
                                          {candidate.fullName} {index === 0 && <Award className="ml-1 h-4 w-4 text-yellow-500" />}
                                          {candidate.runningMate && (
                                            <Badge variant="outline" className="ml-2 border-purple-300 text-purple-600">
                                              with VP
                                            </Badge>
                                          )}
                                        </div>
                                        {candidate.runningMate && (
                                          <div className="text-sm text-gray-500 mt-1">
                                            Running mate: {candidate.runningMate.fullName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                        {candidate.position}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {getFacultyName(candidate.faculty)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex flex-col space-y-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {candidate.voteCount} votes ({candidate.percentage}%)
                                        </div>
                                        <Progress value={candidate.percentage} className="h-2" />
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                // Standard candidate display for Senator elections
                                candidatesWithVotes.map((candidate, index) => (
                                  <tr key={candidate.id} className={index === 0 ? "bg-purple-50" : ""}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                          index === 0 ? "bg-purple-600 text-white" : 
                                          index === 1 ? "bg-purple-400 text-white" : 
                                          index === 2 ? "bg-purple-300 text-white" : "bg-gray-200 text-gray-700"
                                        }`}>
                                          {index === 0 ? <Trophy className="h-4 w-4" /> : (index + 1)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-gray-900 flex items-center">
                                        {candidate.fullName} {index === 0 && <Award className="ml-1 h-4 w-4 text-yellow-500" />}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                        {candidate.position}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {getFacultyName(candidate.faculty)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex flex-col space-y-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {candidate.voteCount} votes ({candidate.percentage}%)
                                        </div>
                                        <Progress value={candidate.percentage} className="h-2" />
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )
                            ) : (
                              <tr className="text-center">
                                <td colSpan={5} className="px-6 py-8 text-sm text-gray-500">
                                  <p>No results available for this election yet.</p>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                  <p className="text-gray-500">No completed elections found.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <p className="text-gray-500">
                No completed elections yet. Check back after an election has ended.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}