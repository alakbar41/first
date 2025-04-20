import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SearchX } from "lucide-react";
import { ElectionsTable } from "@/components/admin/elections-table";
import { CreateElectionDialog } from "@/components/admin/create-election-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Election } from "@shared/schema";

export default function AdminElections() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch elections data
  const { data: elections = [] } = useQuery({
    queryKey: ['/api/elections'],
  });

  // Handle redirects
  if (!user?.isAdmin) {
    navigate('/');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Filter elections by search term if provided
  const filteredElections = searchTerm 
    ? elections.filter((election: any) => 
        election.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        election.position.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : elections;
    
  // Action handlers for ElectionsTable
  const handleEdit = (electionId: number) => {
    // Future implementation for edit page navigation
    toast({
      title: "Edit Election",
      description: `Editing election #${electionId}...`,
    });
    navigate(`/admin/elections/edit/${electionId}`);
  };
  
  const handleDelete = async (electionId: number) => {
    if (window.confirm("Are you sure you want to delete this election? This action cannot be undone.")) {
      try {
        // First get the CSRF token
        const csrfResponse = await fetch('/api/csrf-token');
        const { csrfToken } = await csrfResponse.json();
        
        const response = await fetch(`/api/elections/${electionId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Election deleted successfully",
          });
          // Refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
        } else {
          const error = await response.json();
          toast({
            title: "Error",
            description: error.message || "Failed to delete election",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };
  
  const handleAddCandidates = (election: Election) => {
    navigate(`/admin/elections/${election.id}/candidates/add`);
  };
  
  const handleViewCandidates = (election: Election) => {
    navigate(`/admin/elections/${election.id}/candidates`);
  };
  
  const handleViewDetails = (election: Election) => {
    navigate(`/admin/elections/${election.id}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <AdminSidebar user={user} />
      
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Elections Management</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Create, manage, and monitor university elections
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search elections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-8 py-2"
              />
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Create Election
            </Button>
            <CreateElectionDialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Elections</CardTitle>
            </CardHeader>
            <CardContent>
              <ElectionsTable 
                elections={filteredElections}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddCandidates={handleAddCandidates}
                onViewCandidates={handleViewCandidates}
                onViewDetails={handleViewDetails}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}