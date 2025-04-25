import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Election, Candidate, getFacultyName } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { UserRound, Loader2 } from "lucide-react";
import { useState } from "react";

// Form schema for President/VP
const presidentVPFormSchema = z.object({
  candidateId: z.number({
    required_error: "Please select a candidate",
  }),
  runningMateId: z.number({
    required_error: "Please select a running mate",
  }),
});

// Form schema for Senators (single)
const senatorFormSchema = z.object({
  candidateId: z.number({
    required_error: "Please select a candidate",
  }),
});

// Multiple senators schema
const multiSenatorFormSchema = z.object({
  selectedCandidateIds: z.array(z.number()).min(1, "Please select at least one candidate"),
});

interface AddCandidatesToElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

type PresidentVPFormValues = z.infer<typeof presidentVPFormSchema>;
type SenatorFormValues = z.infer<typeof senatorFormSchema>;
type MultiSenatorFormValues = z.infer<typeof multiSenatorFormSchema>;

export function AddCandidatesToElectionDialog({ 
  open, 
  onOpenChange,
  election
}: AddCandidatesToElectionDialogProps) {
  const { toast } = useToast();
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isPresidentVP = election?.position === "President/VP" || election?.position === "President/Vice President";
  
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
  // Also filter by position and faculty:
  // 1. President/VP positions should only show President or VP candidates (any faculty)
  // 2. Senator positions should only show Senator candidates from matching faculty
  const availableCandidates = candidates?.filter(candidate => {
    if (!electionCandidates) return true;
    if (!election) return true;
    
    // Check if candidate is already in this election
    const notAlreadyInElection = !electionCandidates.some(
      (ec: any) => ec.candidateId === candidate.id || ec.runningMateId === candidate.id
    );
    
    // For President/VP elections
    if (isPresidentVP) {
      return notAlreadyInElection && 
             (candidate.position === "President" || candidate.position === "Vice President");
    } 
    // For Senator elections - must match faculty
    else {
      const isFacultyMatch = election.eligibleFaculties.includes(candidate.faculty);
      return notAlreadyInElection && 
             candidate.position === "Senator" && 
             isFacultyMatch;
    }
  }) || [];
  
  // Separate candidates by position for better organization
  const presidentCandidates = availableCandidates.filter(c => c.position === "President");
  const vpCandidates = availableCandidates.filter(c => c.position === "Vice President");
  const senatorCandidates = availableCandidates.filter(c => c.position === "Senator");
  
  // Form setup for President/VP
  const presidentVPForm = useForm<PresidentVPFormValues>({
    resolver: zodResolver(presidentVPFormSchema),
    defaultValues: {
      candidateId: undefined,
      runningMateId: undefined
    }
  });
  
  // Form setup for Senators (single)
  const senatorForm = useForm<SenatorFormValues>({
    resolver: zodResolver(senatorFormSchema),
    defaultValues: {
      candidateId: undefined
    }
  });
  
  // Form setup for multiple Senators
  const multiSenatorForm = useForm<MultiSenatorFormValues>({
    resolver: zodResolver(multiSenatorFormSchema),
    defaultValues: {
      selectedCandidateIds: []
    }
  });
  
  // Add candidate to election mutation (single candidate)
  const addCandidateMutation = useMutation({
    mutationFn: async (data: { candidateId: number, runningMateId?: number, electionId: number }) => {
      if (!election) throw new Error("No election selected");
      
      const res = await apiRequest("POST", "/api/election-candidates", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate added to election successfully",
      });
      
      // Reset forms and selected candidates
      presidentVPForm.reset();
      senatorForm.reset();
      setSelectedCandidateIds([]);
      
      // Close the dialog if it's a President/VP election
      if (isPresidentVP) {
        onOpenChange(false);
      }
      
      // Invalidate queries to refresh both the election's candidates and the candidates table
      queryClient.invalidateQueries({ queryKey: ["/api/elections", election?.id, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission for President/VP
  const onSubmitPresidentVP = (data: PresidentVPFormValues) => {
    if (!election) return;
    
    addCandidateMutation.mutate({
      ...data,
      electionId: election.id
    });
  };
  
  // Handle form submission for single Senator
  const onSubmitSenator = (data: SenatorFormValues) => {
    if (!election) return;
    
    addCandidateMutation.mutate({
      ...data,
      electionId: election.id
    });
  };
  
  // Handle bulk submission for multiple Senators
  const submitMultipleSenators = async () => {
    if (!election || selectedCandidateIds.length === 0) return;
    
    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      // Process each candidate one by one
      for (const candidateId of selectedCandidateIds) {
        try {
          await addCandidateMutation.mutateAsync({
            candidateId,
            electionId: election.id
          });
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to add candidate ${candidateId}:`, error);
        }
      }
      
      // Show summary toast
      toast({
        title: "Candidates Added",
        description: `Successfully added ${successCount} candidates to the election${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: successCount > 0 ? "default" : "destructive"
      });
      
      // Reset selections
      setSelectedCandidateIds([]);
      
      // Close dialog if all were successful
      if (failCount === 0) {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle candidate selection for multi-select
  const toggleCandidateSelection = (candidateId: number) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId) 
        : [...prev, candidateId]
    );
  };
  
  const renderCandidateAvatar = (candidate: Candidate) => (
    <div className="flex items-center">
      <Avatar className="h-8 w-8 mr-2">
        {candidate.pictureUrl ? (
          <AvatarImage src={candidate.pictureUrl} alt={candidate.fullName} />
        ) : (
          <AvatarFallback>
            <UserRound className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col">
        <span className="font-medium">{candidate.fullName}</span>
        <span className="text-xs text-gray-500">{candidate.position} - {getFacultyName(candidate.faculty)}</span>
      </div>
    </div>
  );
  
  const selectedCandidateId = presidentVPForm.watch("candidateId");
  const selectedCandidate = availableCandidates.find(c => c.id === selectedCandidateId);
  
  // Filter running mates - in President/VP elections, Presidents need VP running mates and vice versa
  const filteredRunningMates = availableCandidates.filter(candidate => {
    if (!isPresidentVP) return false;
    if (!selectedCandidateId) return false;
    
    const selectedCandidate = availableCandidates.find(c => c.id === selectedCandidateId);
    if (!selectedCandidate) return false;
    
    // If selected candidate is President, show only VPs as running mates
    if (selectedCandidate.position === "President") {
      return candidate.position === "Vice President";
    }
    
    // If selected candidate is VP, show only Presidents as running mates
    if (selectedCandidate.position === "Vice President") {
      return candidate.position === "President";
    }
    
    return false;
  });
  
  const isFormDisabled = isCandidatesLoading || isElectionCandidatesLoading || addCandidateMutation.isPending || isSubmitting;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPresidentVP ? "sm:max-w-[500px]" : "sm:max-w-[700px]"}>
        <DialogHeader>
          <DialogTitle>Add Candidate to Election</DialogTitle>
          <DialogDescription>
            {election && `Adding candidate to ${election.name} (${election.position})`}
          </DialogDescription>
        </DialogHeader>
        
        {isPresidentVP ? (
          // President/VP Form
          <Form {...presidentVPForm}>
            <form onSubmit={presidentVPForm.handleSubmit(onSubmitPresidentVP)} className="space-y-6">
              <FormField
                control={presidentVPForm.control}
                name="candidateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select President</FormLabel>
                    <FormControl>
                      <Select
                        disabled={isFormDisabled}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a president" />
                        </SelectTrigger>
                        <SelectContent>
                          {presidentCandidates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id.toString()}>
                              {renderCandidateAvatar(candidate)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={presidentVPForm.control}
                name="runningMateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Vice President</FormLabel>
                    <FormControl>
                      <Select
                        disabled={!selectedCandidateId || isFormDisabled || vpCandidates.length === 0}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vice president" />
                        </SelectTrigger>
                        <SelectContent>
                          {vpCandidates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id.toString()}>
                              {renderCandidateAvatar(candidate)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="mr-2"
                  disabled={isFormDisabled}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={isFormDisabled}
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                >
                  {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          // Senator Multi-Select Form
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="font-medium mb-2">Select Senators to Add</h3>
              <p className="text-sm text-gray-500 mb-4">
                You can select multiple candidates at once, then click "Add Selected" to add them all to the election.
              </p>
              
              {senatorCandidates.length === 0 ? (
                <div className="p-4 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-center">
                  No available candidates to add to this election.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto border border-gray-200 rounded-md p-2">
                  {senatorCandidates.map((candidate) => (
                    <div 
                      key={candidate.id} 
                      className={`flex items-center space-x-2 p-2 rounded-md ${
                        selectedCandidateIds.includes(candidate.id) ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox 
                        id={`candidate-${candidate.id}`}
                        disabled={isFormDisabled}
                        checked={selectedCandidateIds.includes(candidate.id)}
                        onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                      />
                      <label 
                        htmlFor={`candidate-${candidate.id}`}
                        className="flex-1 flex items-center cursor-pointer"
                        onClick={() => toggleCandidateSelection(candidate.id)}
                      >
                        {renderCandidateAvatar(candidate)}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {selectedCandidateIds.length} candidate{selectedCandidateIds.length !== 1 ? 's' : ''} selected
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Select all available candidates
                        const allCandidateIds = senatorCandidates.map(c => c.id);
                        setSelectedCandidateIds(allCandidateIds);
                      }}
                      disabled={isFormDisabled || senatorCandidates.length === 0 || 
                                selectedCandidateIds.length === senatorCandidates.length}
                      className="h-7 text-xs"
                    >
                      Select All
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCandidateIds([])}
                      disabled={isFormDisabled || selectedCandidateIds.length === 0}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedCandidateIds([]);
                      onOpenChange(false);
                    }}
                    disabled={isFormDisabled}
                  >
                    Cancel
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={isFormDisabled || selectedCandidateIds.length === 0}
                    className="bg-purple-700 hover:bg-purple-800 text-white"
                    onClick={submitMultipleSenators}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Selected"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}