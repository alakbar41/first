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
    
  // Fetch blockchain results whenever selected election changes
  useEffect(() => {
    async function fetchBlockchainResults() {
      if (!selectedElection) return;
      
      try {
        setIsLoadingBlockchain(true);
        setBlockchainError(null);
        
        console.log(`Fetching blockchain results for election ${selectedElection.id}`);
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
                      <span className="ml-3 text-gray-600">Loading blockchain data from Ethereum Sepolia...</span>
                    </div>
                  ) : (
                    /* Winner announcement for elections with votes */
                    candidatesWithVotes.length > 0 && (
                      <Card className="mb-6 overflow-hidden bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                        <CardHeader className="pb-2">
                          <div className="flex items-center">
                            <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                            <CardTitle>Election Winner</CardTitle>
                          </div>
                          <CardDescription>
                            Final results verified by Ethereum Sepolia blockchain
                          </CardDescription>
                        </CardHeader>
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
                                      Data verified by Ethereum Sepolia blockchain
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
                                        <div className="text-sm font-medium text-gray-900 mb-1">
                                          {candidate.fullName}
                                          {index === 0 && <Trophy className="inline-block h-4 w-4 text-yellow-500 ml-1" />}
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
                                
                                {/* Bar Chart for standard election results */}
                                <div className="flex flex-col items-center justify-center">
                                  <h3 className="text-sm font-medium text-gray-600 mb-4">Vote Comparison</h3>
                                  <ResponsiveContainer width="100%" height={220}>
                                    <BarChart
                                      data={candidatesWithVotes.map((candidate, index) => ({
                                        name: candidate.fullName.split(' ')[0],
                                        votes: candidate.voteCount,
                                        faculty: getFacultyName(candidate.faculty),
                                        fullName: candidate.fullName,
                                        isWinner: index === 0
                                      }))}
                                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip
                                        formatter={(value: any, name: string, props: any) => [
                                          `${value} votes`,
                                          `${props.payload.fullName} (${props.payload.faculty})`
                                        ]}
                                      />
                                      <Legend />
                                      <Bar 
                                        dataKey="votes" 
                                        name="Votes" 
                                        fill="#7c3aed"
                                        label={{ 
                                          position: 'top',
                                          formatter: (value: any) => `${value}`
                                        }}
                                      >
                                        {candidatesWithVotes.map((entry, index) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={index === 0 ? "#7c3aed" : index === 1 ? "#a78bfa" : "#c4b5fd"}
                                          />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                  <div className="text-xs text-gray-500 mt-4 text-center">
                                    <span className="flex items-center justify-center">
                                      <Database className="h-3 w-3 mr-1" />
                                      Vote data secured by Ethereum blockchain
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="table" className="space-y-4">
                        <Card className="p-6">
                          <h2 className="text-lg font-semibold text-gray-800 mb-1">
                            {selectedElection.name} - Detailed Results
                          </h2>
                          <div className="flex items-center text-sm text-green-600 mb-4">
                            <div className="bg-green-100 p-1 rounded-full mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span>{totalVotes} total votes verified by the blockchain</span>
                          </div>
                          
                          {candidatesWithVotes.length > 0 ? (
                            <div className="overflow-x-auto border rounded-md">
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
                                      Faculty
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Votes
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Percentage
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {candidatesWithVotes.map((candidate, index) => (
                                    <tr key={candidate.id} className={index === 0 ? "bg-purple-50" : ""}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {index + 1}{index === 0 && <Trophy className="inline-block ml-1 h-4 w-4 text-yellow-500" />}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          <div className="flex-shrink-0 h-10 w-10 relative">
                                            {candidate.pictureUrl ? (
                                              <img 
                                                className="h-10 w-10 rounded-full"
                                                src={candidate.pictureUrl}
                                                alt=""
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                }}
                                              />
                                            ) : (
                                              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                <UserCircle className="h-6 w-6 text-purple-500" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                              {candidate.fullName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {candidate.studentId}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getFacultyName(candidate.faculty)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                        {candidate.voteCount}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                          ${index === 0 
                                            ? "bg-green-100 text-green-800" 
                                            : index === 1 
                                              ? "bg-blue-100 text-blue-800" 
                                              : "bg-gray-100 text-gray-800"}`}>
                                          {candidate.percentage}%
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-64 border rounded-md">
                              <div className="text-center p-4">
                                <ListOrderedIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">
                                  No voting results available for this election yet.
                                </p>
                              </div>
                            </div>
                          )}
                        </Card>
                      </TabsContent>
                    </Tabs>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
                  <p className="text-gray-500">No completed elections found.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
              <p className="text-gray-500">No completed elections found.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );

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
                      <h2 className="text-lg font-semibold text-gray-800 mb-1">
                        {selectedElection.name} - Results Visualization
                      </h2>
                      <div className="flex items-center text-sm text-green-600 mb-4">
                        <div className="bg-green-100 p-1 rounded-full mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span>Vote counts are verified by the system</span>
                      </div>
                      
                      <div className="h-80 bg-white rounded-md border border-gray-200 p-4">
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
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="table" className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-1">
                        {selectedElection.name} - Detailed Results
                      </h2>
                      <div className="flex items-center text-sm text-green-600 mb-4">
                        <div className="bg-green-100 p-1 rounded-full mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span>Vote counts are verified by the system</span>
                      </div>
                      
                      <div className="overflow-hidden border border-gray-200 rounded-md">
                        {candidatesWithVotes.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500">No voting results available for this election yet.</p>
                          </div>
                        ) : (
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
                              {isPresidentVPElection && candidatePairs.length > 0 ? 
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
                                          {candidate.fullName} {index === 0 && <Trophy className="ml-1 h-4 w-4 text-yellow-500" />}
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
                                : 
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
                                        {candidate.fullName} {index === 0 && <Trophy className="ml-1 h-4 w-4 text-yellow-500" />}
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
                              }
                            </tbody>
                          </table>
                        )}
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