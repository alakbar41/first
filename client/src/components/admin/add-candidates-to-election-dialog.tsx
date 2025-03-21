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
import { Election, Candidate } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserRound } from "lucide-react";

// Form schema
const formSchema = z.object({
  candidateId: z.number({
    required_error: "Please select a candidate",
  }),
  runningMateId: z.number().optional(),
});

interface AddCandidatesToElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

type FormValues = z.infer<typeof formSchema>;

export function AddCandidatesToElectionDialog({ 
  open, 
  onOpenChange,
  election
}: AddCandidatesToElectionDialogProps) {
  const { toast } = useToast();
  
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
  
  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(
      isPresidentVP 
        ? formSchema 
        : formSchema.omit({ runningMateId: true })
    ),
    defaultValues: {
      candidateId: undefined,
      runningMateId: undefined
    }
  });
  
  // Add candidate to election mutation
  const addCandidateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!election) throw new Error("No election selected");
      
      const payload = {
        ...data,
        electionId: election.id
      };
      
      const res = await apiRequest("POST", "/api/election-candidates", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate added to election successfully",
      });
      
      form.reset();
      onOpenChange(false);
      
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
  
  const onSubmit = (data: FormValues) => {
    addCandidateMutation.mutate(data);
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
      <span>{candidate.fullName} - {candidate.position}</span>
    </div>
  );
  
  const selectedCandidateId = form.watch("candidateId");
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
  
  const isFormDisabled = isCandidatesLoading || isElectionCandidatesLoading || addCandidateMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Candidate to Election</DialogTitle>
          <DialogDescription>
            {election && `Adding candidate to ${election.name} (${election.position})`}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="candidateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isPresidentVP && selectedCandidate?.position === "Vice President" 
                      ? "Select Vice President" 
                      : isPresidentVP 
                        ? "Select President" 
                        : "Select Senator"}
                  </FormLabel>
                  <FormControl>
                    <Select
                      disabled={isFormDisabled}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isPresidentVP && selectedCandidate?.position === "Vice President" 
                            ? "Select a vice president" 
                            : isPresidentVP 
                              ? "Select a president" 
                              : "Select a senator"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCandidates.map((candidate) => (
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
            
            {isPresidentVP && (
              <FormField
                control={form.control}
                name="runningMateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedCandidate?.position === "President" 
                        ? "Select Vice President" 
                        : "Select President"}
                    </FormLabel>
                    <FormControl>
                      <Select
                        disabled={!selectedCandidateId || isFormDisabled || filteredRunningMates.length === 0}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            selectedCandidate?.position === "President" 
                              ? "Select a vice president" 
                              : "Select a president"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRunningMates.map((candidate) => (
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
            )}
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mr-2"
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
      </DialogContent>
    </Dialog>
  );
}