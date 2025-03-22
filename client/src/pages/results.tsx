import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Election } from "@shared/schema";
import { ChartBarIcon, ListOrderedIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Results() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  
  // Fetch completed elections
  const { data: pastElections, isLoading } = useQuery<Election[]>({
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
                      
                      <div className="h-80 flex items-center justify-center bg-gray-50 rounded-md border border-gray-200">
                        <div className="text-center p-4">
                          <ChartBarIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">
                            Vote results will be displayed here from the blockchain.
                          </p>
                        </div>
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
                            <tr className="text-center">
                              <td colSpan={5} className="px-6 py-8 text-sm text-gray-500">
                                <p>Results will be loaded from the blockchain after voting closes.</p>
                              </td>
                            </tr>
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