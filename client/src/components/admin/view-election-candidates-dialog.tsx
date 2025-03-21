import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Election, Candidate } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserRound, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ViewElectionCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

export function ViewElectionCandidatesDialog({ 
  open, 
  onOpenChange,
  election
}: ViewElectionCandidatesDialogProps) {
  const { toast } = useToast();
  
  const isPresidentVP = election?.position === "President/VP" || election?.position === "President/Vice President";
  
  // Get candidates in this election
  const { data: electionCandidates, isLoading } = useQuery({
    queryKey: ["/api/elections", election?.id, "candidates"],
    queryFn: async () => {
      if (!election) return [];
      const response = await fetch(`/api/elections/${election.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: !!election && open // Only fetch when dialog is open and election is defined
  });
  
  const removeCandidateMutation = useMutation({
    mutationFn: async ({ electionId, candidateId }: { electionId: number, candidateId: number }) => {
      const res = await apiRequest("DELETE", `/api/elections/${electionId}/candidates/${candidateId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate removed from election successfully",
      });
      
      // Invalidate both election candidates and general candidates queries
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
  
  const handleRemoveCandidate = (candidateId: number) => {
    if (!election) return;
    removeCandidateMutation.mutate({ electionId: election.id, candidateId });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Election Candidates</DialogTitle>
          <DialogDescription>
            {election && `Viewing candidates for ${election.name} (${election.position})`}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-purple-700 rounded-full"></div>
          </div>
        ) : electionCandidates && electionCandidates.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-white overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {isPresidentVP ? "Running Mate" : "Faculty"}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {electionCandidates.map((ec: any) => (
                    <tr key={ec.id} className="hover:bg-gray-50">
                      {/* Candidate */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            {ec.candidate?.pictureUrl ? (
                              <AvatarImage src={ec.candidate.pictureUrl} alt={ec.candidate.fullName} />
                            ) : (
                              <AvatarFallback>
                                <UserRound className="h-5 w-5" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{ec.candidate?.fullName}</span>
                            <span className="text-sm text-gray-500">ID: {ec.candidate?.studentId}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Position */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                          {ec.candidate?.position}
                        </Badge>
                      </td>
                      
                      {/* Running Mate/Faculty */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {isPresidentVP && ec.runningMate ? (
                          <div className="flex items-center">
                            <Avatar className="h-9 w-9 mr-3">
                              {ec.runningMate?.pictureUrl ? (
                                <AvatarImage src={ec.runningMate.pictureUrl} alt={ec.runningMate.fullName} />
                              ) : (
                                <AvatarFallback>
                                  <UserRound className="h-5 w-5" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-900">{ec.runningMate?.fullName}</span>
                              <span className="text-sm text-gray-500 flex space-x-1">
                                <span>{ec.runningMate?.position}</span>
                                <span>·</span>
                                <span>ID: {ec.runningMate?.studentId}</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span>{ec.candidate?.faculty}</span>
                        )}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveCandidate(ec.candidateId)}
                          disabled={removeCandidateMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No candidates found in this election.</p>
            <p className="text-sm text-gray-400">Use the "Add Candidates" option to add candidates to this election.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}