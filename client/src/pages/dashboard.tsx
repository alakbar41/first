import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Election } from "@shared/schema";
import { ElectionCandidatesList } from "@/components/student/election-candidates-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Clock, InfoIcon, Users, VoteIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentElectionId, setCurrentElectionId] = useState<number | null>(null);

  // Fetch all elections
  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
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

  // Filter elections based on status
  const activeElections = elections?.filter(election => 
    // Current time is between start and end time
    new Date(election.startDate) <= new Date() && new Date(election.endDate) >= new Date()
  ) || [];
  
  const upcomingElections = elections?.filter(election => 
    // Start time is in the future
    new Date(election.startDate) > new Date()
  ) || [];
  
  const pastElections = elections?.filter(election => 
    // End time is in the past
    new Date(election.endDate) < new Date()
  ) || [];

  const getStatusBadge = (election: Election) => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    
    if (now < startDate) {
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="bg-gray-500">Ended</Badge>;
    } else {
      return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get filtered elections for the current faculty for Senator elections
  const filterElectionsByFaculty = (elections: Election[]) => {
    return elections.map(election => {
      // If this is a Senator election, only show if it matches user's faculty
      if (election.position === "Senator") {
        if (election.eligibleFaculties.includes(user.faculty) || election.eligibleFaculties.includes("all")) {
          return election;
        }
        return null;
      }
      // For other election types, show to all users
      return election;
    }).filter(election => election !== null) as Election[];
  };

  const filteredActiveElections = filterElectionsByFaculty(activeElections);
  const filteredUpcomingElections = filterElectionsByFaculty(upcomingElections);
  const filteredPastElections = filterElectionsByFaculty(pastElections);

  // Calculate the currently selected election
  const selectedElection = currentElectionId 
    ? elections?.find(e => e.id === currentElectionId)
    : filteredActiveElections[0] || filteredUpcomingElections[0] || filteredPastElections[0];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
                Elections Dashboard
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                View and participate in current and upcoming university elections
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                {user.faculty ? `${user.faculty} Student` : 'Student'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
            </div>
          ) : elections && elections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Elections list sidebar */}
              <div className="md:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">All Elections</h2>
                  </div>
                  
                  <Tabs defaultValue="active" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="active" className="w-1/3">
                        Active
                        {filteredActiveElections.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">
                            {filteredActiveElections.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="upcoming" className="w-1/3">
                        Upcoming
                        {filteredUpcomingElections.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {filteredUpcomingElections.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="past" className="w-1/3">
                        Past
                        {filteredPastElections.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {filteredPastElections.length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="p-0">
                      {filteredActiveElections.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No active elections
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredActiveElections.map(election => (
                            <button
                              key={election.id}
                              className={`block w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedElection?.id === election.id ? 'bg-purple-50' : ''
                              }`}
                              onClick={() => setCurrentElectionId(election.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-800">{election.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {election.position}
                                  </p>
                                </div>
                                {getStatusBadge(election)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="upcoming" className="p-0">
                      {filteredUpcomingElections.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No upcoming elections
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredUpcomingElections.map(election => (
                            <button
                              key={election.id}
                              className={`block w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedElection?.id === election.id ? 'bg-purple-50' : ''
                              }`}
                              onClick={() => setCurrentElectionId(election.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-800">{election.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {election.position}
                                  </p>
                                </div>
                                {getStatusBadge(election)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="past" className="p-0">
                      {filteredPastElections.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No past elections
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {filteredPastElections.map(election => (
                            <button
                              key={election.id}
                              className={`block w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                selectedElection?.id === election.id ? 'bg-purple-50' : ''
                              }`}
                              onClick={() => setCurrentElectionId(election.id)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-gray-800">{election.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {election.position}
                                  </p>
                                </div>
                                {getStatusBadge(election)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              
              {/* Selected election details and candidates */}
              <div className="md:col-span-3">
                {selectedElection ? (
                  <div className="space-y-6">
                    {/* Election details card */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 bg-purple-50 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-semibold text-purple-800">
                            {selectedElection.name}
                          </h2>
                          {getStatusBadge(selectedElection)}
                        </div>
                      </div>
                      
                      <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Position</p>
                              <p className="text-sm text-gray-800">
                                {selectedElection.position}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">Start Time</p>
                              <p className="text-sm text-gray-800">
                                {formatDate(selectedElection.startDate)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-500">End Time</p>
                              <p className="text-sm text-gray-800">
                                {formatDate(selectedElection.endDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {selectedElection.description && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-500">Description</p>
                            <p className="text-sm text-gray-800 mt-1">
                              {selectedElection.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Candidates section */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <VoteIcon className="w-5 h-5 mr-2 text-purple-600" />
                        Candidates
                      </h3>
                      
                      {/* Only show vote UI for active elections */}
                      {new Date(selectedElection.startDate) <= new Date() && 
                       new Date(selectedElection.endDate) >= new Date() ? (
                        <ElectionCandidatesList election={selectedElection} />
                      ) : new Date(selectedElection.startDate) > new Date() ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 flex items-center">
                          <InfoIcon className="w-5 h-5 mr-2" />
                          <div>
                            <p className="font-medium">This election has not started yet</p>
                            <p className="text-sm">Voting will be available once the election starts on {formatDate(selectedElection.startDate)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-800 flex items-center">
                          <InfoIcon className="w-5 h-5 mr-2" />
                          <div>
                            <p className="font-medium">This election has ended</p>
                            <p className="text-sm">Voting closed on {formatDate(selectedElection.endDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                    <p className="text-gray-500">
                      Select an election from the list to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <p className="text-gray-500">No elections have been created yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}