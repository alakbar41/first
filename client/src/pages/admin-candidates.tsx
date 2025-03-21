import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Search, X, Filter } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Candidate, FACULTIES, CANDIDATE_POSITIONS } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CreateCandidateDialog } from "@/components/admin/create-candidate-dialog";
import { EditCandidateDialog } from "@/components/admin/edit-candidate-dialog";
import { CandidatesTable } from "@/components/admin/candidates-table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminCandidates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreateCandidateOpen, setIsCreateCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters for candidates
  const [facultyFilter, setFacultyFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch candidates
  const { data: candidates, isLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    }
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/candidates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // To check if candidate is in elections
  const checkCandidateInElectionsMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("GET", `/api/candidates/${id}/in-elections`);
      return res.json();
    },
    onSuccess: (data, id) => {
      if (data.inElections) {
        // Candidate is in elections, show proper warning
        const electionNames = data.elections.map((e: any) => e.name).join(", ");
        
        toast({
          title: "Cannot Delete Candidate",
          description: `This candidate is part of the following election(s): ${electionNames}. Please remove the candidate from all elections first.`,
          variant: "destructive",
        });
      } else {
        // Safe to delete, ask for confirmation
        if (confirm("Are you sure you want to delete this candidate?")) {
          deleteCandidateMutation.mutate(id);
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to check if candidate is part of elections. " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteCandidate = (id: number) => {
    // First check if candidate is in any elections
    checkCandidateInElectionsMutation.mutate(id);
  };

  const handleEditCandidate = (id: number) => {
    const candidate = candidates?.find(c => c.id === id);
    if (candidate) {
      setCurrentCandidate(candidate);
      setIsEditCandidateOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Candidate not found",
        variant: "destructive",
      });
    }
  };

  if (!user?.isAdmin) {
    navigate("/");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Apply all filters to candidates
  const filteredCandidates = candidates
    ? candidates.filter(candidate => {
        // Search filter
        const matchesSearch = 
          searchQuery === "" || 
          candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          candidate.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          candidate.studentId.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Faculty filter
        const matchesFaculty = facultyFilter === "all" || candidate.faculty === facultyFilter;
        
        // Position filter
        const matchesPosition = positionFilter === "all" || candidate.position === positionFilter;
        
        // Status filter
        const matchesStatus = statusFilter === "all" || candidate.status === statusFilter;
        
        return matchesSearch && matchesFaculty && matchesPosition && matchesStatus;
      })
    : [];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Candidates Management</h1>
        </div>
        
        <div className="p-6">
          {/* Search, filters, and actions */}
          <div className="mb-6">
            {/* Top row: Search and Add Button */}
            <div className="flex justify-between items-center mb-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search candidates..." 
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
                onClick={() => setIsCreateCandidateOpen(true)}
                className="flex items-center rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Candidate
              </Button>
            </div>
            
            {/* Filters row */}
            <div className="flex space-x-4">
              {/* Faculty filter */}
              <div className="w-48">
                <Select value={facultyFilter} onValueChange={setFacultyFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Faculties</SelectItem>
                    <SelectItem value="SITE">SITE</SelectItem>
                    <SelectItem value="SB">SB</SelectItem>
                    <SelectItem value="SPA">SPA</SelectItem>
                    <SelectItem value="SESD">SESD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Position filter */}
              <div className="w-48">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Positions</SelectItem>
                    <SelectItem value="President">President</SelectItem>
                    <SelectItem value="Vice President">Vice President</SelectItem>
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
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear filters button */}
              {(facultyFilter !== "all" || positionFilter !== "all" || statusFilter !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFacultyFilter("all");
                    setPositionFilter("all");
                    setStatusFilter("all");
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
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-800">All Candidates</h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 flex justify-center items-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
              </div>
            ) : (
              <>
                <CandidatesTable 
                  candidates={filteredCandidates} 
                  onDelete={handleDeleteCandidate}
                  onEdit={handleEditCandidate}
                />
                
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {filteredCandidates.length} candidates
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
            )}
          </div>
        </div>
      </main>
      
      <CreateCandidateDialog 
        open={isCreateCandidateOpen} 
        onOpenChange={setIsCreateCandidateOpen}
      />
      
      <EditCandidateDialog
        open={isEditCandidateOpen}
        onOpenChange={setIsEditCandidateOpen}
        candidate={currentCandidate}
      />
    </div>
  );
}