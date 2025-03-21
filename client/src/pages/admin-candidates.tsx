import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Candidate } from "@shared/schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { CreateCandidateDialog } from "@/components/admin/create-candidate-dialog";
import { CandidatesTable } from "@/components/admin/candidates-table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function AdminCandidates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isCreateCandidateOpen, setIsCreateCandidateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleDeleteCandidate = (id: number) => {
    if (confirm("Are you sure you want to delete this candidate?")) {
      deleteCandidateMutation.mutate(id);
    }
  };

  const handleEditCandidate = (id: number) => {
    // Will be implemented in future update
    toast({
      title: "Info",
      description: "Edit functionality will be implemented soon.",
    });
  };

  if (!user?.isAdmin) {
    navigate("/");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Filter candidates by search query
  const filteredCandidates = candidates
    ? candidates.filter(candidate => 
        candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.faculty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.studentId.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
          {/* Search and actions */}
          <div className="flex justify-between items-center mb-6">
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
    </div>
  );
}