import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Candidate, Election, getFacultyName } from "@shared/schema";
import { ChartBarIcon, ListOrderedIcon, UserCircle, Trophy, AlertCircle, Database, Award, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getElectionResultsFromBlockchain } from "@/lib/blockchain";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Interface for candidate with votes
interface CandidateWithVotes extends Candidate {
  voteCount: number;
  percentage: number;
  runningMate?: CandidateWithVotes; // For president/VP elections
  hash?: string; // Blockchain hash
}

export default function Results() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [candidatesWithVotes, setCandidatesWithVotes] = useState<CandidateWithVotes[]>([]);
  const [isLoadingBlockchain, setIsLoadingBlockchain] = useState(false);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  
  // Fetch completed elections
  const { data: pastElections, isLoading: isLoadingElections } = useQuery<Election[]>({
    queryKey: ["/api/elections/past"],
    queryFn: async () => {
      // Get past elections by filtering all elections client-side
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      const elections = await response.json();

      // Filter for completed elections or those that have ended
      const completedElections = elections.filter((election: Election) => 
        election.status === 'completed' || new Date(election.endDate) < new Date()
      );
      
      // Sort elections by name to ensure consistent ordering
      return completedElections.sort((a: Election, b: Election) => a.name.localeCompare(b.name));
    },
  });

  // Get the selected election
  const selectedElection = useMemo(() => {
    if (!pastElections || pastElections.length === 0) return undefined;
    
    return selectedElectionId 
      ? pastElections.find(e => e.id.toString() === selectedElectionId)
      : pastElections[0];
  }, [pastElections, selectedElectionId]);
  
  // Redirect logic inside useEffect
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.isAdmin) {
      navigate("/admin");
    }
  }, [user, navigate]);
  
  // If not authenticated or admin, show loading
  if (!user || user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }
    
  // Fetch blockchain results whenever selected election changes
  useEffect(() => {
    async function fetchBlockchainResults() {
      if (!selectedElection) return;
      
      try {
        setIsLoadingBlockchain(true);
        setBlockchainError(null);
        
        console.log(`Fetching blockchain results for election ${selectedElection.id} (blockchain ID: ${selectedElection.blockchainId})`);
        
        // Approach is different based on whether election has blockchain ID or not
        if (selectedElection.blockchainId) {
          // This election is on the blockchain, we can get the results directly
          const results = await getElectionResultsFromBlockchain(selectedElection.id);
          
          if (results.error) {
            console.warn(`Error fetching blockchain results: ${results.error}`);
            setBlockchainError(results.error);
            setCandidatesWithVotes([]);
          } else {
            console.log(`Received ${results.candidates.length} candidates with votes from blockchain`);
            setCandidatesWithVotes(results.candidates);
            setTotalVotes(results.totalVotes);
          }
        } else {
          // No blockchain ID, so we can't get blockchain results
          setBlockchainError("This election has not been deployed to the blockchain");
          setCandidatesWithVotes([]);
          setTotalVotes(0);
        }
      } catch (error) {
        console.error("Error fetching blockchain results:", error);
        setBlockchainError(error instanceof Error ? error.message : "Unknown error occurred");
        setCandidatesWithVotes([]);
      } finally {
        setIsLoadingBlockchain(false);
      }
    }
    
    fetchBlockchainResults();
  }, [selectedElection]);
  
  // Identify President/VP pairs for President/VP elections
  const isPresidentVPElection = selectedElection?.position === "President/VP";
  
  const candidatePairs = useMemo(() => {
    if (!isPresidentVPElection || !candidatesWithVotes.length) return [];
    
    const presidents = candidatesWithVotes.filter(c => c.position === "President");
    const vps = candidatesWithVotes.filter(c => c.position === "Vice President");
    
    return presidents.map(president => {
      // Match president with a VP (in a real app we would have an actual relationship)
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
          {isLoadingElections ? (
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
                <>
                  {/* Blockchain verification badge */}
                  {selectedElection.blockchainId ? (
                    <div className="flex items-center gap-2 mb-4 text-sm text-green-600">
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-medium gap-1 flex items-center py-1">
                        <Database className="h-3 w-3" />
                        Blockchain Verified
                      </Badge>
                      <span className="text-slate-600 text-xs">(ID: {selectedElection.blockchainId})</span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-medium gap-1 flex items-center mb-4 py-1">
                      <AlertCircle className="h-3 w-3" />
                      Not On Blockchain
                    </Badge>
                  )}
                  
                  {blockchainError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>
                        {blockchainError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isLoadingBlockchain ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
                      <span className="ml-3 text-gray-600">Loading blockchain data from Polygon Mainnet...</span>
                    </div>
                  ) : (
                    /* Winner announcement for elections with votes */
                    candidatesWithVotes.length > 0 && (
                      <Card className="mb-6 overflow-hidden bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-center">
                            <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                            {/* Check for tie condition for display */}
                            <CardTitle>
                              {candidatesWithVotes.length > 1 && 
                               candidatesWithVotes[0].voteCount === candidatesWithVotes[1].voteCount
                                ? "Election Results - Tie Detected"
                                : "Election Winner"}
                            </CardTitle>
                          </div>
                          <CardDescription>
                            Final results verified by Polygon Mainnet blockchain
                          </CardDescription>
                        </CardHeader>
                        
                        {/* Show tie notification if applicable */}
                        {candidatesWithVotes.length > 1 && 
                         candidatesWithVotes[0].voteCount === candidatesWithVotes[1].voteCount && (
                          <div className="px-6 py-2 bg-amber-50 border-y border-amber-100">
                            <div className="flex items-center text-sm text-amber-800">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <span>
                                Tie detected! Multiple candidates have the highest vote count ({candidatesWithVotes[0].voteCount})
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <CardContent>
                          {isPresidentVPElection && candidatePairs.length > 0 ? (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 mr-4">
                                {candidatePairs[0].pictureUrl ? (
                                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-300 ring-2 ring-yellow-100">
                                    <img 
                                      src={candidatePairs[0].pictureUrl} 
                                      alt={candidatePairs[0].fullName} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-yellow-300">
                                    <UserCircle className="text-gray-400 w-10 h-10" />
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <h3 className="text-lg font-bold flex items-center">
                                  {candidatePairs[0].fullName}
                                  <Award className="ml-2 h-5 w-5 text-yellow-500" />
                                  {candidatePairs.length > 1 && 
                                   candidatePairs[0].voteCount === candidatePairs[1].voteCount && (
                                    <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                                      Tied for 1st
                                    </span>
                                  )}
                                </h3>
                                {candidatePairs[0].runningMate && (
                                  <p className="text-sm text-gray-600">
                                    with {candidatePairs[0].runningMate.fullName} as Vice President
                                  </p>
                                )}
                                <div className="mt-2 flex items-center text-sm">
                                  <span className="font-semibold text-purple-700 mr-2">{candidatePairs[0].voteCount} votes</span>
                                  <span className="text-gray-600">({candidatePairs[0].percentage}% of total)</span>
                                  <Badge className="ml-3 bg-purple-100 text-purple-800 hover:bg-purple-200">
                                    {getFacultyName(candidatePairs[0].faculty)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ) : candidatesWithVotes.length > 0 ? (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 mr-4">
                                {candidatesWithVotes[0].pictureUrl ? (
                                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-yellow-300 ring-2 ring-yellow-100">
                                    <img 
                                      src={candidatesWithVotes[0].pictureUrl} 
                                      alt={candidatesWithVotes[0].fullName} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-yellow-300">
                                    <UserCircle className="text-gray-400 w-10 h-10" />
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <h3 className="text-lg font-bold flex items-center">
                                  {candidatesWithVotes[0].fullName}
                                  <Award className="ml-2 h-5 w-5 text-yellow-500" />
                                  {candidatesWithVotes.length > 1 && 
                                   candidatesWithVotes[0].voteCount === candidatesWithVotes[1].voteCount && (
                                    <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                                      Tied for 1st
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-600">{candidatesWithVotes[0].position}</p>
                                <div className="mt-2 flex items-center text-sm">
                                  <span className="font-semibold text-purple-700 mr-2">{candidatesWithVotes[0].voteCount} votes</span>
                                  <span className="text-gray-600">({candidatesWithVotes[0].percentage}% of total)</span>
                                  <Badge className="ml-3 bg-purple-100 text-purple-800 hover:bg-purple-200">
                                    {getFacultyName(candidatesWithVotes[0].faculty)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          
                          {/* Display other tied candidates if applicable */}
                          {candidatesWithVotes.length > 1 && 
                           candidatesWithVotes[0].voteCount === candidatesWithVotes[1].voteCount && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                              <h4 className="text-sm font-medium text-gray-500 mb-3">Other candidates tied for first place:</h4>
                              {candidatesWithVotes.slice(1).map((candidate, index) => 
                                candidate.voteCount === candidatesWithVotes[0].voteCount && (
                                  <div key={candidate.id} className="flex items-center mt-4">
                                    <div className="flex-shrink-0 mr-4">
                                      {candidate.pictureUrl ? (
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-300">
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
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center border-2 border-yellow-300">
                                          <UserCircle className="text-gray-400 w-8 h-8" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <h3 className="text-base font-bold flex items-center">
                                        {candidate.fullName}
                                        <Award className="ml-2 h-4 w-4 text-yellow-500" />
                                        <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                                          Tied for 1st
                                        </span>
                                      </h3>
                                      <p className="text-sm text-gray-600">{candidate.position}</p>
                                      <div className="mt-1 flex items-center text-sm">
                                        <span className="font-semibold text-purple-700 mr-2">{candidate.voteCount} votes</span>
                                        <span className="text-gray-600">({candidate.percentage}% of total)</span>
                                        <Badge className="ml-3 bg-purple-100 text-purple-800 hover:bg-purple-200">
                                          {getFacultyName(candidate.faculty)}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center text-xs text-gray-500">
                            <Database className="h-3 w-3 mr-1 text-purple-500" />
                            <span>All vote counts securely recorded on the blockchain</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                  
                  {!isLoadingBlockchain && (
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
                        <Card className="p-6">
                          <h2 className="text-lg font-semibold text-gray-800 mb-1">
                            {selectedElection.name} - Results Visualization
                          </h2>
                          <div className="flex items-center text-sm text-green-600 mb-4">
                            <div className="bg-green-100 p-1 rounded-full mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span>{totalVotes} total votes verified by the blockchain</span>
                          </div>
                          
                          <div className="h-80 bg-white rounded-md p-4">
                            {candidatesWithVotes.length === 0 ? (
                              <div className="h-full flex items-center justify-center">
                                <div className="text-center p-4">
                                  <ChartBarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                  <p className="text-gray-500">
                                    No voting results available for this election yet.
                                  </p>
                                </div>
                              </div>
                            ) : isPresidentVPElection && candidatePairs.length > 0 ? (
                              // President/VP election results visualization
                              <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="flex flex-col space-y-6">
                                  {candidatePairs.map((candidate, index) => (
                                    <div key={candidate.id} className="flex items-center space-x-4">
                                      <div className="w-8 text-right text-gray-600 text-sm font-medium">
                                        {index + 1}
                                      </div>
                                      <div className="w-16 flex-shrink-0">
                                        {candidate.pictureUrl ? (
                                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${index === 0 ? "border-yellow-300" : "border-purple-100"}`}>
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
                                          <div className={`w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center ${index === 0 ? "border-2 border-yellow-300" : ""}`}>
                                            <UserCircle className="text-gray-400 w-8 h-8" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-grow">
                                        <div className="flex items-center mb-1">
                                          <div className="text-sm font-medium text-gray-900 mr-2">
                                            {candidate.fullName}
                                            {index === 0 && <Trophy className="inline-block h-4 w-4 text-yellow-500 ml-1" />}
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
                                
                                {/* Pie Chart for President/VP results */}
                                <div className="flex flex-col items-center justify-center">
                                  <h3 className="text-sm font-medium text-gray-600 mb-4">Vote Distribution</h3>
                                  <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                      <Pie
                                        data={candidatePairs.map((candidate, index) => ({
                                          name: candidate.fullName,
                                          value: candidate.voteCount,
                                          faculty: getFacultyName(candidate.faculty),
                                          isWinner: index === 0
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                      >
                                        {candidatePairs.map((candidate, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={index === 0 ? "#7c3aed" : index === 1 ? "#a78bfa" : "#c4b5fd"}
                                          />
                                        ))}
                                      </Pie>
                                      <Tooltip 
                                        formatter={(value: number, name: string, props: any) => [
                                          `${value} votes (${props.payload.payload.isWinner ? 'Winner' : ''})`,
                                          `${name} - ${props.payload.payload.faculty}`
                                        ]}
                                      />
                                      <Legend formatter={(value, entry: any) => {
                                        const isWinner = entry.payload.isWinner;
                                        return (
                                          <span className="text-xs">
                                            {value} {isWinner && <Trophy className="inline-block h-3 w-3 text-yellow-500 ml-1" />}
                                          </span>
                                        );
                                      }} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                  <div className="text-xs text-gray-500 mt-4 text-center">
                                    <span className="flex items-center justify-center">
                                      <Database className="h-3 w-3 mr-1" />
                                      Data verified by Polygon Mainnet blockchain
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Standard election results visualization
                              <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="flex flex-col space-y-4">
                                  {candidatesWithVotes.map((candidate, index) => (
                                    <div key={candidate.id} className="flex items-center space-x-4">
                                      <div className="w-8 text-right text-gray-600 text-sm font-medium">
                                        {index + 1}
                                      </div>
                                      <div className="w-16 flex-shrink-0">
                                        {candidate.pictureUrl ? (
                                          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${index === 0 ? "border-yellow-300" : "border-purple-100"}`}>
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
                                          <div className={`w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center ${index === 0 ? "border-2 border-yellow-300" : ""}`}>
                                            <UserCircle className="text-gray-400 w-8 h-8" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-grow">
                                        <div className="flex items-center mb-1">
                                          <div className="text-sm font-medium text-gray-900 mr-2">
                                            {candidate.fullName}
                                            {/* Highlight tied winners or single winner */}
                                            {index === 0 && (
                                              <>
                                                <Trophy className="inline-block h-4 w-4 text-yellow-500 ml-1" />
                                                {candidatesWithVotes.length > 1 && 
                                                 candidatesWithVotes[0].voteCount === candidatesWithVotes[1].voteCount && (
                                                  <span className="ml-1 text-xs font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                                                    Tied
                                                  </span>
                                                )}
                                              </>
                                            )}
                                            {/* Show tie badge for other tied candidates */}
                                            {index > 0 && candidate.voteCount === candidatesWithVotes[0].voteCount && (
                                              <>
                                                <Trophy className="inline-block h-4 w-4 text-yellow-500 ml-1" />
                                                <span className="ml-1 text-xs font-normal bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                                                  Tied
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          {candidate.position && (
                                            <Badge variant="outline" className="border-gray-300 text-gray-600 text-xs">
                                              {candidate.position}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                          <div 
                                            className={`h-full flex items-center rounded-full pl-2 ${
                                              index === 0 ? "bg-purple-600" : 
                                              candidate.voteCount === candidatesWithVotes[0].voteCount ? "bg-purple-600" :
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
                                
                                {/* Pie Chart for standard election results */}
                                <div className="flex flex-col items-center justify-center">
                                  <h3 className="text-sm font-medium text-gray-600 mb-4">Vote Distribution</h3>
                                  <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                      <Pie
                                        data={candidatesWithVotes.map((candidate, index) => ({
                                          name: candidate.fullName,
                                          value: candidate.voteCount,
                                          faculty: getFacultyName(candidate.faculty),
                                          isWinner: index === 0 || (candidate.voteCount === candidatesWithVotes[0].voteCount)
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                      >
                                        {candidatesWithVotes.map((candidate, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={
                                              (index === 0 || candidate.voteCount === candidatesWithVotes[0].voteCount) 
                                                ? "#7c3aed" 
                                                : index === 1 
                                                  ? "#a78bfa" 
                                                  : "#c4b5fd"
                                            }
                                          />
                                        ))}
                                      </Pie>
                                      <Tooltip 
                                        formatter={(value: number, name: string, props: any) => [
                                          `${value} votes (${props.payload.payload.isWinner ? 'Winner' : ''})`,
                                          `${name} - ${props.payload.payload.faculty}`
                                        ]}
                                      />
                                      <Legend formatter={(value, entry: any) => {
                                        const isWinner = entry.payload.isWinner;
                                        return (
                                          <span className="text-xs">
                                            {value} {isWinner && <Trophy className="inline-block h-3 w-3 text-yellow-500 ml-1" />}
                                          </span>
                                        );
                                      }} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                  <div className="text-xs text-gray-500 mt-4 text-center">
                                    <span className="flex items-center justify-center">
                                      <Database className="h-3 w-3 mr-1" />
                                      Data verified by Polygon Mainnet blockchain
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="table" className="space-y-4">
                        <Card>
                          {candidatesWithVotes.length > 0 ? (
                            <div className="overflow-x-auto border rounded-md">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 border-b">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {isPresidentVPElection && candidatePairs.length > 0 ? (
                                    candidatePairs.map((candidate, index) => (
                                      <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                          {candidate.fullName}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                          President
                                          {candidate.runningMate && (
                                            <span className="block text-xs text-gray-400">
                                              with {candidate.runningMate.fullName} as VP
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getFacultyName(candidate.faculty)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.voteCount}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{candidate.percentage}%</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {index === 0 && (!candidatePairs[1] || candidatePairs[0].voteCount > candidatePairs[1].voteCount) ? (
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Winner</Badge>
                                          ) : (index === 0 || (candidatePairs[0].voteCount === candidate.voteCount)) ? (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Tied</Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-gray-600">Runner-up</Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    candidatesWithVotes.map((candidate, index) => (
                                      <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                          {candidate.fullName}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{candidate.position}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{getFacultyName(candidate.faculty)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{candidate.voteCount}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{candidate.percentage}%</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                          {index === 0 && (!candidatesWithVotes[1] || candidatesWithVotes[0].voteCount > candidatesWithVotes[1].voteCount) ? (
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Winner</Badge>
                                          ) : (index === 0 || (candidatesWithVotes[0].voteCount === candidate.voteCount)) ? (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Tied</Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-gray-600">Runner-up</Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
                              <p className="text-gray-500">
                                There are no voting results for this election yet.
                              </p>
                            </div>
                          )}
                        </Card>
                      </TabsContent>
                    </Tabs>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Election Selected</h3>
                  <p className="text-gray-500">
                    Please select an election from the dropdown above to view results.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Elections</h3>
              <p className="text-gray-500">
                There are no completed elections to display results for.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}