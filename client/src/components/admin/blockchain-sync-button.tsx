import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3, ElectionType } from "@/hooks/use-web3";
import { Loader2, Cloud, ServerCog } from "lucide-react";
import { Election } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BlockchainSyncButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function BlockchainSyncButton({
  variant = "outline",
  size = "sm",
  className = "",
}: BlockchainSyncButtonProps) {
  const { toast } = useToast();
  const { 
    isInitialized,
    isWalletConnected,
    connectWallet,
    createElection,
    createCandidate,
    registerCandidateForElection 
  } = useWeb3();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ 
    elections: number; 
    candidates: number; 
    registrations: number; 
    total: number;
    current: number;
    errors: string[];
  }>({
    elections: 0,
    candidates: 0,
    registrations: 0,
    total: 0,
    current: 0,
    errors: [],
  });

  // Fetch elections from database
  const { data: elections } = useQuery<Election[]>({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await fetch('/api/elections');
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  // Fetch candidates from database
  const { data: candidates } = useQuery<any[]>({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const response = await fetch('/api/candidates');
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  // Fetch election-candidate relationships
  const { data: electionCandidates } = useQuery<any[]>({
    queryKey: ['/api/election-candidates'],
    queryFn: async () => {
      const response = await fetch('/api/election-candidates');
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  const handleSync = async () => {
    if (!isWalletConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet Connection Required",
          description: "Please connect your wallet to sync with blockchain.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSyncing(true);
    setSyncStatus({
      elections: 0,
      candidates: 0,
      registrations: 0,
      total: 0,
      current: 0,
      errors: [],
    });

    try {
      // Calculate total operations
      const totalOperations = (elections?.length || 0) + (candidates?.length || 0) + (electionCandidates?.length || 0);
      setSyncStatus(prev => ({ ...prev, total: totalOperations }));

      // 1. Create all elections on blockchain
      if (elections && elections.length > 0) {
        for (const election of elections) {
          try {
            const startTime = Math.floor(new Date(election.startDate).getTime() / 1000);
            const endTime = Math.floor(new Date(election.endDate).getTime() / 1000);
            const electionType = election.position === "Senator" ? ElectionType.Senator : ElectionType.PresidentVP;
            const eligibleFaculties = election.eligibleFaculties.join(',');
            
            // Use blockchain ID equal to database ID for simplicity
            await createElection(
              election.name,
              electionType,
              startTime,
              endTime,
              eligibleFaculties
            );
            
            setSyncStatus(prev => ({ 
              ...prev, 
              elections: prev.elections + 1,
              current: prev.current + 1
            }));
          } catch (error: any) {
            console.error(`Failed to create election ${election.id}:`, error);
            setSyncStatus(prev => ({ 
              ...prev,
              current: prev.current + 1,
              errors: [...prev.errors, `Election ${election.id}: ${error.message || 'Failed to create'}`]
            }));
          }
        }
      }

      // 2. Create all candidates on blockchain
      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          try {
            await createCandidate(
              candidate.studentId,
              candidate.faculty
            );
            
            setSyncStatus(prev => ({ 
              ...prev, 
              candidates: prev.candidates + 1,
              current: prev.current + 1
            }));
          } catch (error: any) {
            console.error(`Failed to create candidate ${candidate.id}:`, error);
            setSyncStatus(prev => ({ 
              ...prev,
              current: prev.current + 1,
              errors: [...prev.errors, `Candidate ${candidate.id}: ${error.message || 'Failed to create'}`]
            }));
          }
        }
      }

      // 3. Register candidates for elections
      if (electionCandidates && electionCandidates.length > 0) {
        for (const ec of electionCandidates) {
          try {
            await registerCandidateForElection(
              ec.electionId,
              ec.candidateId
            );
            
            setSyncStatus(prev => ({ 
              ...prev, 
              registrations: prev.registrations + 1,
              current: prev.current + 1
            }));
          } catch (error: any) {
            console.error(`Failed to register candidate ${ec.candidateId} for election ${ec.electionId}:`, error);
            setSyncStatus(prev => ({ 
              ...prev,
              current: prev.current + 1,
              errors: [...prev.errors, `Registration of candidate ${ec.candidateId} for election ${ec.electionId}: ${error.message || 'Failed'}`]
            }));
          }
        }
      }

      toast({
        title: "Blockchain Voting Enabled",
        description: `Successfully set up blockchain voting structures for ${syncStatus.elections} elections, ${syncStatus.candidates} candidates, and ${syncStatus.registrations} eligibility records.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Blockchain Voting Setup Failed",
        description: error.message || "Failed to set up blockchain voting structures",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`${className} gap-2`}
        onClick={() => setShowConfirmDialog(true)}
        disabled={isSyncing || !isInitialized}
      >
        {isSyncing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ServerCog className="h-4 w-4 mr-2" />
        )}
        ENABLE BLOCKCHAIN VOTING
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Blockchain Voting</AlertDialogTitle>
            <AlertDialogDescription>
              This will enable blockchain-based voting for your elections. Only voting records will be stored on the blockchain, while election and candidate details remain in the database.
              <br /><br />
              Make sure you have MetaMask installed and connected to Polygon Amoy testnet.
              <br /><br />
              This operation will create a minimal reference structure on the blockchain that allows secure vote counting.
              <br /><br />
              Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowConfirmDialog(false);
              setShowDialog(true);
            }}>
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Status Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Blockchain Voting Setup</DialogTitle>
            <DialogDescription>
              {isSyncing ? "Setting up blockchain voting structures..." : "Blockchain voting enabled"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Election Voting Structures:</span>
                <span className="font-medium">{syncStatus.elections} / {elections?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Candidate Vote Trackers:</span>
                <span className="font-medium">{syncStatus.candidates} / {candidates?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Voting Eligibility Records:</span>
                <span className="font-medium">{syncStatus.registrations} / {electionCandidates?.length || 0}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ 
                    width: syncStatus.total > 0 
                      ? `${(syncStatus.current / syncStatus.total) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>

            {/* Error list */}
            {syncStatus.errors.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm text-red-600">Errors:</h4>
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded bg-red-50 p-2">
                  <ul className="text-xs text-red-800 space-y-1">
                    {syncStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {isSyncing ? (
              <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up voting...
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleSync}>
                  <ServerCog className="mr-2 h-4 w-4" />
                  Enable Voting
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}