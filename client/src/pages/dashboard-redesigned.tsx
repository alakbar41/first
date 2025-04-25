import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Election, getFacultyName } from "@shared/schema";
import { ElectionDetailView } from "@/components/student/election-detail-view";
import { ElectionCard } from "@/components/student/election-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut as LogOutIcon, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentElectionId, setCurrentElectionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Show 8 elections per page
  
  // Filter states
  const [eligibilityFilter, setEligibilityFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Calculate active filter count
  const activeFilterCount = [
    eligibilityFilter !== "all"
  ].filter(Boolean).length;
  
  // Fetch all elections
  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    },
  });
  
  // Handle redirects in useEffect instead of during render
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    } else if (user.isAdmin) {
      navigate("/admin");
    }
  }, [user, navigate]);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Loading state or redirecting states
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Admin users should be redirected to their dashboard
  if (user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to admin dashboard...</p>
      </div>
    );
  }

  // Filter elections based on status
  const activeElections = elections?.filter(election => 
    // Current time is between start and end time
    new Date(election.startDate) <= new Date() && 
    new Date(election.endDate) >= new Date()
  ) || [];

  const upcomingElections = elections?.filter(election => 
    // Current time is before start time
    new Date(election.startDate) > new Date()
  ) || [];

  const completedElections = elections?.filter(election => 
    // Current time is after end time
    new Date(election.endDate) < new Date()
  ) || [];

  // Apply eligibility filter if needed
  const applyEligibilityFilter = (elections: Election[]) => {
    if (eligibilityFilter === "all") {
      return elections; // No filtering
    } else if (eligibilityFilter === "eligible") {
      // Show only elections for user's faculty or all faculties
      return elections.filter(election => {
        if (election.position === "President/VP" || election.position === "President/Vice President") {
          return true; // All students can vote in President/VP elections
        }
        
        // For Senator elections, check if user's faculty is eligible
        return election.eligibleFaculties.includes(user.faculty) || election.eligibleFaculties.includes("all");
      });
    } else if (eligibilityFilter === "other") {
      // Show only elections for other faculties (that user can't vote in)
      return elections.filter(election => {
        if (election.position === "President/VP" || election.position === "President/Vice President") {
          return false; // Exclude President/VP since all students can vote in these
        }
        
        // Include only Senator elections where user's faculty is not eligible
        return !election.eligibleFaculties.includes(user.faculty) && !election.eligibleFaculties.includes("all");
      });
    }
    
    return elections; // Default case
  };
  
  const filteredActiveElections = applyEligibilityFilter(activeElections);
  const filteredUpcomingElections = applyEligibilityFilter(upcomingElections);
  const filteredCompletedElections = applyEligibilityFilter(completedElections);
  const filteredAllElections = [...filteredActiveElections, ...filteredUpcomingElections, ...filteredCompletedElections];
  
  // Get current page elections for the active tab
  const getCurrentPageElections = () => {
    let currentElections: Election[] = [];
    
    switch (activeTab) {
      case 'all':
        currentElections = filteredAllElections;
        break;
      case 'active':
        currentElections = filteredActiveElections;
        break;
      case 'upcoming':
        currentElections = filteredUpcomingElections;
        break;
      case 'completed':
        currentElections = filteredCompletedElections;
        break;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(currentElections.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    return {
      paginatedElections: currentElections.slice(indexOfFirstItem, indexOfLastItem),
      totalPages,
      indexOfFirstItem,
      indexOfLastItem,
      totalItems: currentElections.length
    };
  };
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  // Reset page number when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Update the selected election when currentElectionId changes
  useEffect(() => {
    if (currentElectionId && elections) {
      const election = elections.find(e => e.id === currentElectionId);
      if (election) {
        setSelectedElection(election);
      }
    } else {
      setSelectedElection(null);
    }
  }, [currentElectionId, elections]);

  // Handle election selection
  const handleElectionClick = (electionId: number) => {
    setCurrentElectionId(electionId);
  };

  // Handle back button click
  const handleBackClick = () => {
    setCurrentElectionId(null);
    setSelectedElection(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <StudentSidebar user={user} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-6">
        <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
                  UniVote Elections
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  View and participate in current and upcoming university elections
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
              <span className="text-xs sm:text-sm text-gray-500">Logged in as:</span>
              <span className="text-xs sm:text-sm font-medium text-purple-700 truncate max-w-[150px]">
                {user.email}
              </span>
            </div>
          </div>
        </div>
        
        {/* Mobile logo and title */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center">
            <h2 className="text-base font-semibold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
              UniVote Elections
            </h2>
          </div>
        </div>
        
        {/* Mobile navigation bar */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex justify-between items-center">
            <Link to="/">
              <span className="text-purple-700 font-medium px-3 py-2 cursor-pointer">Elections</span>
            </Link>
            <Link to="/results">
              <span className="text-gray-600 px-3 py-2 cursor-pointer">Results</span>
            </Link>
            <Link to="/guidelines">
              <span className="text-gray-600 px-3 py-2 cursor-pointer">Guidelines</span>
            </Link>
            <button 
              onClick={handleLogout} 
              className="text-gray-600 px-3 py-2"
            >
              <LogOutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Main content area with navigation tabs at the top */}
        <div className="p-3 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
            </div>
          ) : elections && elections.length > 0 ? (
            <>
              {selectedElection ? (
                <>
                  {/* Back button when viewing election details */}
                  <Button 
                    variant="outline" 
                    className="mb-4 flex items-center" 
                    onClick={handleBackClick}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Elections
                  </Button>
                  
                  {/* Election detail view */}
                  <ElectionDetailView election={selectedElection} />
                </>
              ) : (
                /* Elections list view with tabs */
                <Tabs 
                  defaultValue="all" 
                  className="w-full"
                  onValueChange={(value) => setActiveTab(value)}
                >
                  {/* Top navigation bar */}
                  <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0 mb-4">
                      <TabsList className="w-full md:w-auto grid grid-cols-4">
                        <TabsTrigger value="all">
                          All
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {filteredAllElections.length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="active">
                          Active
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                            {filteredActiveElections.length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="upcoming">
                          Upcoming
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {filteredUpcomingElections.length}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                          Past
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">
                            {filteredCompletedElections.length}
                          </span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="flex items-center space-x-2">
                        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
                              <Filter className="h-3.5 w-3.5 lg:mr-2" />
                              <span className="hidden lg:inline-block">Filters</span>
                              {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1 py-0 h-5 min-w-5 text-xs">
                                  {activeFilterCount}
                                </Badge>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-4" align="end">
                            <div className="space-y-4">
                              <h4 className="font-medium text-sm">Eligibility</h4>
                              <Select 
                                value={eligibilityFilter} 
                                onValueChange={(value) => {
                                  setEligibilityFilter(value);
                                  setCurrentPage(1); // Reset to first page when filter changes
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="All elections" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All elections</SelectItem>
                                  <SelectItem value="eligible">Only my faculty</SelectItem>
                                  <SelectItem value="other">Other faculties</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              {activeFilterCount > 0 && (
                                <Button 
                                  variant="outline" 
                                  className="w-full mt-4" 
                                  size="sm"
                                  onClick={() => {
                                    setEligibilityFilter("all");
                                    setCurrentPage(1);
                                  }}
                                >
                                  <X className="h-3.5 w-3.5 mr-2" />
                                  Clear filters
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
  
                  <div className="grid grid-cols-1 gap-6">
                    {/* All elections tab */}
                    <TabsContent value="all" className="mt-0 space-y-4">
                      {filteredAllElections.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                          <p className="text-gray-500">No elections available</p>
                        </div>
                      ) : (
                        <>
                          {/* Current page elections */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getCurrentPageElections().paginatedElections.map(election => (
                              <ElectionCard 
                                key={election.id}
                                election={election}
                                onClick={handleElectionClick}
                                isSelected={false}
                              />
                            ))}
                          </div>
                          
                          {/* Pagination controls */}
                          {getCurrentPageElections().totalPages > 1 && (
                            <div className="mt-6 flex flex-col items-center space-y-2">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                      className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                  
                                  {/* Render page numbers */}
                                  {Array.from({ length: getCurrentPageElections().totalPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page}>
                                      <PaginationLink 
                                        onClick={() => handlePageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => handlePageChange(Math.min(getCurrentPageElections().totalPages, currentPage + 1))}
                                      className={currentPage === getCurrentPageElections().totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                              
                              {/* Pagination stats */}
                              <div className="text-sm text-gray-500">
                                Showing {getCurrentPageElections().indexOfFirstItem + 1}-{Math.min(getCurrentPageElections().indexOfLastItem, getCurrentPageElections().totalItems)} of {getCurrentPageElections().totalItems} elections
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                    
                    {/* Active elections tab */}
                    <TabsContent value="active" className="mt-0 space-y-4">
                      {filteredActiveElections.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                          <p className="text-gray-500">No active elections</p>
                        </div>
                      ) : (
                        <>
                          {/* Current page elections */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getCurrentPageElections().paginatedElections.map(election => (
                              <ElectionCard 
                                key={election.id}
                                election={election}
                                onClick={handleElectionClick}
                                isSelected={false}
                              />
                            ))}
                          </div>
                          
                          {/* Pagination controls */}
                          {getCurrentPageElections().totalPages > 1 && (
                            <div className="mt-6 flex flex-col items-center space-y-2">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                      className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                  
                                  {/* Render page numbers */}
                                  {Array.from({ length: getCurrentPageElections().totalPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page}>
                                      <PaginationLink 
                                        onClick={() => handlePageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => handlePageChange(Math.min(getCurrentPageElections().totalPages, currentPage + 1))}
                                      className={currentPage === getCurrentPageElections().totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                              
                              {/* Pagination stats */}
                              <div className="text-sm text-gray-500">
                                Showing {getCurrentPageElections().indexOfFirstItem + 1}-{Math.min(getCurrentPageElections().indexOfLastItem, getCurrentPageElections().totalItems)} of {getCurrentPageElections().totalItems} elections
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                    
                    {/* Upcoming elections tab */}
                    <TabsContent value="upcoming" className="mt-0 space-y-4">
                      {filteredUpcomingElections.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                          <p className="text-gray-500">No upcoming elections</p>
                        </div>
                      ) : (
                        <>
                          {/* Current page elections */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getCurrentPageElections().paginatedElections.map(election => (
                              <ElectionCard 
                                key={election.id}
                                election={election}
                                onClick={handleElectionClick}
                                isSelected={false}
                              />
                            ))}
                          </div>
                          
                          {/* Pagination controls */}
                          {getCurrentPageElections().totalPages > 1 && (
                            <div className="mt-6 flex flex-col items-center space-y-2">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                      className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                  
                                  {/* Render page numbers */}
                                  {Array.from({ length: getCurrentPageElections().totalPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page}>
                                      <PaginationLink 
                                        onClick={() => handlePageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => handlePageChange(Math.min(getCurrentPageElections().totalPages, currentPage + 1))}
                                      className={currentPage === getCurrentPageElections().totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                              
                              {/* Pagination stats */}
                              <div className="text-sm text-gray-500">
                                Showing {getCurrentPageElections().indexOfFirstItem + 1}-{Math.min(getCurrentPageElections().indexOfLastItem, getCurrentPageElections().totalItems)} of {getCurrentPageElections().totalItems} elections
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                    
                    {/* Completed elections tab */}
                    <TabsContent value="completed" className="mt-0 space-y-4">
                      {filteredCompletedElections.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                          <p className="text-gray-500">No completed elections</p>
                        </div>
                      ) : (
                        <>
                          {/* Current page elections */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getCurrentPageElections().paginatedElections.map(election => (
                              <ElectionCard 
                                key={election.id}
                                election={election}
                                onClick={handleElectionClick}
                                isSelected={false}
                              />
                            ))}
                          </div>
                          
                          {/* Pagination controls */}
                          {getCurrentPageElections().totalPages > 1 && (
                            <div className="mt-6 flex flex-col items-center space-y-2">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                      className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                  
                                  {/* Render page numbers */}
                                  {Array.from({ length: getCurrentPageElections().totalPages }, (_, i) => i + 1).map(page => (
                                    <PaginationItem key={page}>
                                      <PaginationLink 
                                        onClick={() => handlePageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => handlePageChange(Math.min(getCurrentPageElections().totalPages, currentPage + 1))}
                                      className={currentPage === getCurrentPageElections().totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                              
                              {/* Pagination stats */}
                              <div className="text-sm text-gray-500">
                                Showing {getCurrentPageElections().indexOfFirstItem + 1}-{Math.min(getCurrentPageElections().indexOfLastItem, getCurrentPageElections().totalItems)} of {getCurrentPageElections().totalItems} elections
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </>
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