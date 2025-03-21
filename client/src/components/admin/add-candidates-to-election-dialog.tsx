import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, UserCircle } from "lucide-react";
import { Candidate, Election } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AddCandidatesToElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

const formSchema = z.object({
  candidateId: z.number().min(1, "Please select a candidate"),
  runningMateId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddCandidatesToElectionDialog({ 
  open, 
  onOpenChange, 
  election 
}: AddCandidatesToElectionDialogProps) {
  const { toast } = useToast();
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedRunningMate, setSelectedRunningMate] = useState<Candidate | null>(null);

  // Query to fetch all candidates
  const { data: candidates, isLoading: isCandidatesLoading } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Query to fetch election candidates
  const { data: electionCandidates, refetch: refetchElectionCandidates } = useQuery<any[]>({
    queryKey: ["/api/elections", election?.id, "candidates"],
    queryFn: async () => {
      if (!election) return [];
      const response = await fetch(`/api/elections/${election.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: open && !!election, // Only fetch when dialog is open and election is provided
  });

  // Check if election requires paired candidates (President/VP)
  useEffect(() => {
    if (election) {
      setIsPaired(election.position === "President/VP");
    }
  }, [election]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedCandidate(null);
      setSelectedRunningMate(null);
    }
  }, [open]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      candidateId: undefined,
      runningMateId: undefined,
    },
  });

  // Mutation to add candidate to election
  const addCandidateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!election) throw new Error("No election selected");
      
      const payload = {
        electionId: election.id,
        candidateId: data.candidateId,
        runningMateId: data.runningMateId || 0,
      };
      
      const res = await apiRequest("POST", "/api/election-candidates", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate added to election successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/elections", election?.id, "candidates"] });
      
      form.reset();
      setSelectedCandidate(null);
      setSelectedRunningMate(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    // Validate that paired positions have proper roles
    if (isPaired) {
      if (!selectedCandidate || !selectedRunningMate) {
        toast({
          title: "Error",
          description: "Both President and Vice President must be selected",
          variant: "destructive",
        });
        return;
      }

      if (selectedCandidate.position !== "President" && selectedRunningMate.position !== "Vice President") {
        toast({
          title: "Error",
          description: "For President/VP elections, you must select one President and one Vice President",
          variant: "destructive",
        });
        return;
      }
    }

    addCandidateMutation.mutate(data);
  };

  // Get eligible candidates that aren't already in this election
  const getEligibleCandidates = () => {
    if (!candidates) return [];
    
    // Get IDs of candidates already in this election
    const existingCandidateIds = electionCandidates 
      ? electionCandidates.flatMap(ec => [ec.candidateId, ec.runningMateId])
      : [];
    
    // Filter out candidates already in this election
    const eligible = candidates.filter(c => !existingCandidateIds.includes(c.id));
    
    // For paired elections, filter by position
    if (isPaired && selectedCandidate) {
      if (selectedCandidate.position === "President") {
        return eligible.filter(c => c.position === "Vice President");
      } else if (selectedCandidate.position === "Vice President") {
        return eligible.filter(c => c.position === "President");
      }
    }
    
    return eligible;
  };

  // Handle candidate selection
  const handleCandidateChange = (candidateId: string) => {
    const id = parseInt(candidateId);
    const candidate = candidates?.find(c => c.id === id);
    setSelectedCandidate(candidate || null);
    form.setValue("candidateId", id);
    
    // Reset running mate if candidate changes
    setSelectedRunningMate(null);
    form.setValue("runningMateId", undefined);
  };

  // Handle running mate selection
  const handleRunningMateChange = (runningMateId: string) => {
    const id = parseInt(runningMateId);
    const runningMate = candidates?.find(c => c.id === id);
    setSelectedRunningMate(runningMate || null);
    form.setValue("runningMateId", id);
  };

  // Render candidate avatar
  const renderCandidateAvatar = (candidate: Candidate) => (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={candidate.pictureUrl || undefined} alt={candidate.fullName} />
        <AvatarFallback className="bg-purple-100">
          <UserCircle className="h-4 w-4 text-purple-500" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{candidate.fullName}</span>
        <Badge 
          variant="outline" 
          className="text-xs"
        >
          {candidate.position}
        </Badge>
      </div>
    </div>
  );

  if (!election) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Candidates to Election</DialogTitle>
          <DialogDescription>
            {isPaired 
              ? "This election requires paired candidates (President and Vice President)"
              : `Add candidates to the "${election.name}" election`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="candidateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isPaired ? "Select President/VP Candidate" : "Select Candidate"}</FormLabel>
                  <FormControl>
                    <Select
                      disabled={isCandidatesLoading}
                      onValueChange={handleCandidateChange}
                      value={field.value?.toString()}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a candidate" />
                      </SelectTrigger>
                      <SelectContent>
                        {getEligibleCandidates().length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 text-center">
                            No eligible candidates available
                          </div>
                        ) : (
                          getEligibleCandidates().map((candidate) => (
                            <SelectItem 
                              key={candidate.id} 
                              value={candidate.id.toString()}
                              className="py-2"
                            >
                              {renderCandidateAvatar(candidate)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPaired && selectedCandidate && (
              <FormField
                control={form.control}
                name="runningMateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Select {selectedCandidate.position === "President" ? "Vice President" : "President"} Running Mate
                    </FormLabel>
                    <FormControl>
                      <Select
                        disabled={isCandidatesLoading || !selectedCandidate}
                        onValueChange={handleRunningMateChange}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select a ${selectedCandidate.position === "President" ? "Vice President" : "President"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getEligibleCandidates().length === 0 ? (
                            <div className="p-2 text-sm text-gray-500 text-center">
                              No eligible running mates available
                            </div>
                          ) : (
                            getEligibleCandidates().map((candidate) => (
                              <SelectItem 
                                key={candidate.id} 
                                value={candidate.id.toString()}
                                className="py-2"
                              >
                                {renderCandidateAvatar(candidate)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={addCandidateMutation.isPending || isCandidatesLoading}
                className="bg-purple-700 hover:bg-purple-800"
              >
                {addCandidateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add to Election"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}