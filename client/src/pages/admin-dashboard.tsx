import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
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

  // Filter elections by search query
  const filteredElections = elections
    ? elections.filter(election => 
        election.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        election.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
          {/* Search and actions */}
          <div className="flex justify-between items-center mb-6">
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
          
          <div className="shadow-sm rounded-md overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-800">All Elections</h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 flex justify-center items-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
              </div>
            ) : (
              <>
                <ElectionsTable 
                  elections={filteredElections} 
                  onDelete={handleDeleteElection}
                  onEdit={handleEditElection}
                  onAddCandidates={handleAddCandidates}
                  onViewCandidates={handleViewCandidates}
                />
                
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Rows per page: <span className="font-medium">8</span>
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