import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Election, Candidate, getFacultyName } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserRound, Check, X, Loader2, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface AddMultipleCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

export function AddMultipleCandidatesDialog({ 
  open, 
  onOpenChange,
  election
}: AddMultipleCandidatesDialogProps) {
  const { toast } = useToast();
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch all candidates
  const { data: candidates, isLoading: isCandidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: open // Only fetch when dialog is open
  });
  
  // Get existing candidates in this election
  const { data: electionCandidates, isLoading: isElectionCandidatesLoading } = useQuery({
    queryKey: ["/api/elections", election?.id, "candidates"],
    queryFn: async () => {
      if (!election) return [];
      const response = await fetch(`/api/elections/${election.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: !!election && open // Only fetch when dialog is open and election is defined
  });
  
  // Filter out candidates that are already in this election
  // Also filter by position and faculty for Senator elections
  const availableCandidates = candidates?.filter(candidate => {
    if (!electionCandidates) return true;
    if (!election) return true;
    
    // Check if candidate is already in this election
    const notAlreadyInElection = !electionCandidates.some(
      (ec: any) => ec.candidateId === candidate.id || ec.runningMateId === candidate.id
    );
    
    // For Senator elections, check if the candidate's faculty matches at least one of the election's eligible faculties
    const isPositionMatch = candidate.position === "Senator";
    
    // Check faculty match - important: for Senator elections, the candidate must belong to ONE OF the eligible faculties
    let isFacultyMatch = false;
    
    if (election.eligibleFaculties && Array.isArray(election.eligibleFaculties)) {
      // Check if the candidate's faculty is included in the election's eligible faculties
      isFacultyMatch = election.eligibleFaculties.includes(candidate.faculty);
    }
    
    // Apply search filter
    const matchesSearch = searchTerm === "" || 
      candidate.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return notAlreadyInElection && isPositionMatch && isFacultyMatch && matchesSearch;
  }) || [];
  
  // Add candidate to election mutation
  const addCandidateMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      if (!election) throw new Error("No election selected");
      
      const response = await apiRequest("POST", "/api/election-candidates", {
        electionId: election.id,
        candidateId: candidateId,
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to add candidate to election");
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate both election candidates and general candidates queries
      queryClient.invalidateQueries({ queryKey: ["/api/elections", election?.id, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    }
  });
  
  // Add all selected candidates at once
  const addSelectedCandidates = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one candidate",
        variant: "default",
      });
      return;
    }
    
    try {
      // Use Promise.all to add all candidates in parallel
      await Promise.all(selectedCandidates.map(candidateId => 
        addCandidateMutation.mutateAsync(candidateId)
      ));
      
      toast({
        title: "Success",
        description: `Added ${selectedCandidates.length} candidates to the election`,
      });
      
      // Reset selected candidates
      setSelectedCandidates([]);
      
      // Close the dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding candidates:", error);
      toast({
        title: "Error",
        description: "Failed to add some candidates. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Toggle candidate selection
  const toggleCandidateSelection = (candidateId: number) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };
  
  // Handle "Select All" functionality
  const handleSelectAll = () => {
    if (availableCandidates.length === selectedCandidates.length) {
      // If all are selected, deselect all
      setSelectedCandidates([]);
    } else {
      // Otherwise, select all
      setSelectedCandidates(availableCandidates.map(c => c.id));
    }
  };
  
  // Check if all are selected
  const allSelected = availableCandidates.length > 0 && 
    availableCandidates.length === selectedCandidates.length;
  
  const isLoading = isCandidatesLoading || isElectionCandidatesLoading;
  const isPending = addCandidateMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Multiple Candidates to Election</DialogTitle>
          <DialogDescription>
            {election && `Select Senator candidates for ${election.name}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-2">
          {/* Search bar */}
          <div className="flex items-center relative">
            <Search className="w-4 h-4 absolute left-3 text-gray-400" />
            <Input
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Select all option */}
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
            <Checkbox 
              id="select-all" 
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              disabled={availableCandidates.length === 0 || isLoading}
            />
            <label 
              htmlFor="select-all" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {allSelected ? "Deselect All" : "Select All"} ({availableCandidates.length} candidates)
            </label>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : availableCandidates && availableCandidates.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto pr-2">
              {availableCandidates.map(candidate => (
                <div 
                  key={candidate.id}
                  className={`flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50 transition cursor-pointer ${
                    selectedCandidates.includes(candidate.id) ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => toggleCandidateSelection(candidate.id)}
                >
                  <Checkbox 
                    checked={selectedCandidates.includes(candidate.id)}
                    onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                  />
                  <Avatar className="h-10 w-10 border border-gray-200">
                    {candidate.pictureUrl ? (
                      <AvatarImage src={candidate.pictureUrl} alt={candidate.fullName} />
                    ) : (
                      <AvatarFallback>
                        <UserRound className="h-6 w-6 text-gray-400" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{candidate.fullName}</span>
                    <span className="text-xs text-gray-500">
                      {candidate.studentId} - {getFacultyName(candidate.faculty)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No suitable candidates found.</p>
              <p className="text-sm text-gray-400 mt-1">
                All eligible candidates may already be in this election.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              {selectedCandidates.length} candidates selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={addSelectedCandidates}
                disabled={selectedCandidates.length === 0 || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Selected Candidates'
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}