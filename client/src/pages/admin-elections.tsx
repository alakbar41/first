import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SearchX, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { ElectionsTable } from "@/components/admin/elections-table";
import { CreateElectionDialog } from "@/components/admin/create-election-dialog";
import { EditElectionDialog } from "@/components/admin/edit-election-dialog";
import { ViewElectionDetailsDialog } from "@/components/admin/view-election-details-dialog";
import { AddCandidatesToElectionDialog } from "@/components/admin/add-candidates-to-election-dialog";
import { ViewElectionCandidatesDialog } from "@/components/admin/view-election-candidates-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Election, FACULTY_CODES, getFacultyName } from "@shared/schema";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminElections() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = useState(false);
  const [isAddCandidatesDialogOpen, setIsAddCandidatesDialogOpen] = useState(false);
  const [isViewCandidatesDialogOpen, setIsViewCandidatesDialogOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");
  const [facultyFilter, setFacultyFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 8; // Show 8 elections per page
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch elections data
  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ['/api/elections'],
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, positionFilter, facultyFilter, searchTerm]);

  // Handle redirects
  if (!user?.isAdmin) {
    navigate('/');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Gather all unique positions for filter dropdown
  const uniquePositions = Array.from(new Set(elections.map(election => election.position)));

  // Apply filters sequentially
  let filteredElections = [...elections];
  
  // Apply search filter
  if (searchTerm) {
    filteredElections = filteredElections.filter((election: Election) => 
      election.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.position.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Apply status filter
  if (statusFilter) {
    filteredElections = filteredElections.filter((election: Election) => 
      election.status === statusFilter
    );
  }
  
  // Apply position filter
  if (positionFilter) {
    filteredElections = filteredElections.filter((election: Election) => 
      election.position === positionFilter
    );
  }
  
  // Apply faculty filter
  if (facultyFilter) {
    filteredElections = filteredElections.filter((election: Election) => 
      election.eligibleFaculties.includes(facultyFilter)
    );
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredElections.length / itemsPerPage);
  
  // Get current page data
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentElections = filteredElections.slice(indexOfFirstItem, indexOfLastItem);
  
  // Count how many active filters we have
  const activeFilterCount = [statusFilter, positionFilter, facultyFilter].filter(Boolean).length;
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setStatusFilter("");
    setPositionFilter("");
    setFacultyFilter("");
    setSearchTerm("");
    setCurrentPage(1);
  };
    
  // Action handlers for ElectionsTable
  const handleEdit = (electionId: number) => {
    // Find the election to edit
    const electionToEdit = elections.find(e => e.id === electionId);
    if (electionToEdit) {
      setSelectedElection(electionToEdit);
      setIsEditDialogOpen(true);
    } else {
      toast({
        title: "Error",
        description: "Election not found",
        variant: "destructive",
      });
    }
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
    setSelectedElection(election);
    setIsAddCandidatesDialogOpen(true);
  };
  
  const handleViewCandidates = (election: Election) => {
    setSelectedElection(election);
    setIsViewCandidatesDialogOpen(true);
  };
  
  const handleViewDetails = (election: Election) => {
    setSelectedElection(election);
    setIsViewDetailsDialogOpen(true);
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
            <div className="flex items-center gap-2">
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
                variant="outline" 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800 h-5 min-w-5 flex items-center justify-center rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="text-sm text-gray-500 flex items-center"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
              )}
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
            
            {/* Edit Election Dialog */}
            <EditElectionDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              election={selectedElection}
            />
            
            {/* View Election Details Dialog */}
            <ViewElectionDetailsDialog
              open={isViewDetailsDialogOpen}
              onOpenChange={setIsViewDetailsDialogOpen}
              election={selectedElection}
            />
            
            {/* Add Candidates to Election Dialog */}
            <AddCandidatesToElectionDialog
              open={isAddCandidatesDialogOpen}
              onOpenChange={setIsAddCandidatesDialogOpen}
              election={selectedElection}
            />
            
            {/* View Election Candidates Dialog */}
            <ViewElectionCandidatesDialog
              open={isViewCandidatesDialogOpen}
              onOpenChange={setIsViewCandidatesDialogOpen}
              election={selectedElection}
            />
          </div>

          {/* Filter panel that appears when Filter button is clicked */}
          {showFilters && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-3">Filter Elections</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status filter */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Status</label>
                  <Select
                    value={statusFilter || "all"}
                    onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Position filter */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Position</label>
                  <Select
                    value={positionFilter || "all"}
                    onValueChange={(value) => setPositionFilter(value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {uniquePositions.map(position => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Faculty filter */}
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Eligible Faculty</label>
                  <Select
                    value={facultyFilter || "all_faculties"}
                    onValueChange={(value) => setFacultyFilter(value === "all_faculties" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_faculties">All Faculties</SelectItem>
                      {FACULTY_CODES.map(faculty => (
                        <SelectItem key={faculty} value={faculty}>
                          {getFacultyName(faculty)}
                        </SelectItem>
                      ))}
                      <SelectItem value="all">All Faculties (University-wide)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Elections</CardTitle>
            </CardHeader>
            <CardContent>
              <ElectionsTable 
                elections={currentElections}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddCandidates={handleAddCandidates}
                onViewCandidates={handleViewCandidates}
                onViewDetails={handleViewDetails}
              />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {/* Render page numbers */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              
              {/* Display pagination stats */}
              <div className="text-sm text-gray-500 mt-2 text-center">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredElections.length)} of {filteredElections.length} elections
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}