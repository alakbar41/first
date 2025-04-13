import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Filter } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Election } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ElectionsTable } from "@/components/admin/elections-table";
import { CreateElectionDialog } from "@/components/admin/create-election-dialog";
import { EditElectionDialog } from "@/components/admin/edit-election-dialog";
import { AddCandidatesToElectionDialog } from "@/components/admin/add-candidates-to-election-dialog";
import { ViewElectionCandidatesDialog } from "@/components/admin/view-election-candidates-dialog";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreateElectionOpen, setIsCreateElectionOpen] = useState(false);
  const [isEditElectionOpen, setIsEditElectionOpen] = useState(false);
  const [isAddCandidatesOpen, setIsAddCandidatesOpen] = useState(false);
  const [isViewCandidatesOpen, setIsViewCandidatesOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters for elections
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [facultyFilter, setFacultyFilter] = useState<string>("all");

  // Fetch elections
  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    }
  });

  const deleteElectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/elections/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Election deleted successfully",
      });
      // Invalidate both elections and candidates data to refresh statuses
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      
      // Force refresh of candidate status checks
      // This will clear any cached "in-election" status results
      setTimeout(() => {
        const candidateStatusPath = /^\/api\/candidates\/\d+\/in-elections$/;
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKey = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
            return typeof queryKey === 'string' && candidateStatusPath.test(queryKey);
          }
        });
      }, 300);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteElection = (id: number) => {
    if (confirm("Are you sure you want to delete this election?")) {
      deleteElectionMutation.mutate(id);
    }
  };

  const handleEditElection = (id: number) => {
    const election = elections?.find(e => e.id === id);
    if (election) {
      setSelectedElection(election);
      setIsEditElectionOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Election not found",
        variant: "destructive",
      });
    }
  };
  
  const handleAddCandidates = (election: Election) => {
    setSelectedElection(election);
    setIsAddCandidatesOpen(true);
  };
  
  const handleViewCandidates = (election: Election) => {
    setSelectedElection(election);
    setIsViewCandidatesOpen(true);
  };

  if (!user?.isAdmin) {
    navigate("/");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }
  
  // Apply all filters to elections
  const filteredElections = elections
    ? elections.filter(election => {
        // Search filter
        const matchesSearch = 
          searchQuery === "" || 
          election.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          election.position.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Position filter
        const matchesPosition = 
          positionFilter === "all" || 
          election.position === positionFilter;
        
        // Status filter
        const matchesStatus = 
          statusFilter === "all" || 
          election.status === statusFilter;
        
        // Faculty filter (for Senator elections)
        const matchesFaculty = 
          facultyFilter === "all" || 
          (election.eligibleFaculties && election.eligibleFaculties.includes(facultyFilter));
        
        return matchesSearch && matchesPosition && matchesStatus && matchesFaculty;
      })
    : [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Admin Election Page</h1>
        </div>
        
        <div className="p-6">
          {/* Search, filters, and actions */}
          <div className="mb-6">
            {/* Top row: Search and Add Button */}
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-10 bg-white" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    onClick={() => setSearchQuery("")}
                  >
                    &times;
                  </button>
                )}
              </div>
              
              <Button 
                onClick={() => setIsCreateElectionOpen(true)}
                className="flex items-center rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Election
              </Button>
            </div>
            
            {/* Filters row */}
            <div className="flex space-x-4">
              {/* Position filter */}
              <div className="w-48">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="President/Vice President">President/Vice President</SelectItem>
                    <SelectItem value="Senator">Senator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status filter */}
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Faculty filter */}
              <div className="w-72">
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    <SelectItem value="SITE">SITE Students</SelectItem>
                    <SelectItem value="SB">SB Students</SelectItem>
                    <SelectItem value="SPA">SPA Students</SelectItem>
                    <SelectItem value="SESD">SESD Students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear filters button */}
              {(positionFilter !== "all" || statusFilter !== "all" || facultyFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPositionFilter("all");
                    setStatusFilter("all");
                    setFacultyFilter("all");
                  }}
                  className="flex items-center"
                >
                  <X className="mr-1 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          <div className="shadow-sm rounded-md overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800 mb-4">Elections Management</h2>
              
              {/* Tabs for different election categories */}
              <div className="flex overflow-x-auto border-b border-gray-200 -mx-6 px-6 pb-1">
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    statusFilter === 'all' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setStatusFilter('all')}
                >
                  All Elections
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    statusFilter === 'active' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setStatusFilter('active')}
                >
                  Active
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    statusFilter === 'upcoming' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setStatusFilter('upcoming')}
                >
                  Upcoming
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    statusFilter === 'completed' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setStatusFilter('completed')}
                >
                  Completed
                </button>
                
                {/* Blockchain-specific tabs */}
                <div className="border-l border-gray-300 mx-2"></div>
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center ${
                    statusFilter === 'blockchain-deployed' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => {
                    setStatusFilter('blockchain-deployed');
                    // We'll set this custom filter and handle separately
                  }}
                >
                  <ServerIcon className="mr-1 h-4 w-4" />
                  Blockchain Deployed
                </button>
                <button 
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap flex items-center ${
                    statusFilter === 'not-deployed' 
                      ? 'text-purple-700 border-b-2 border-purple-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => {
                    setStatusFilter('not-deployed');
                    // We'll set this custom filter and handle separately
                  }}
                >
                  Not Deployed
                </button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-8 flex justify-center items-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
              </div>
            ) : (
              <>
                <ElectionsTable 
                  elections={
                    // Handle special blockchain filter cases
                    statusFilter === 'blockchain-deployed' 
                      ? elections?.filter(e => e.blockchainId !== null && e.blockchainId !== undefined) || []
                      : statusFilter === 'not-deployed'
                      ? elections?.filter(e => e.blockchainId === null || e.blockchainId === undefined) || []
                      : filteredElections
                  } 
                  onDelete={handleDeleteElection}
                  onEdit={handleEditElection}
                  onAddCandidates={handleAddCandidates}
                  onViewCandidates={handleViewCandidates}
                />
                
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{
                      statusFilter === 'blockchain-deployed' 
                        ? elections?.filter(e => e.blockchainId !== null && e.blockchainId !== undefined).length
                        : statusFilter === 'not-deployed'
                        ? elections?.filter(e => e.blockchainId === null || e.blockchainId === undefined).length
                        : filteredElections.length
                    }</span> elections found
                  </div>
                  
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#">2</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            )
          </div>
        </div>
      </main>
      
      <CreateElectionDialog 
        open={isCreateElectionOpen} 
        onOpenChange={setIsCreateElectionOpen}
      />
      
      <AddCandidatesToElectionDialog
        open={isAddCandidatesOpen}
        onOpenChange={setIsAddCandidatesOpen}
        election={selectedElection}
      />
      
      <ViewElectionCandidatesDialog
        open={isViewCandidatesOpen}
        onOpenChange={setIsViewCandidatesOpen}
        election={selectedElection}
      />
      
      <EditElectionDialog
        open={isEditElectionOpen}
        onOpenChange={setIsEditElectionOpen}
        election={selectedElection}
      />
    </div>
  );
}