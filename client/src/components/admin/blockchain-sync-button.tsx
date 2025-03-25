import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3, ElectionType } from "@/hooks/use-web3";
import { Loader2, CloudSync } from "lucide-react";
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
        title: "Blockchain Sync Complete",
        description: `Successfully synchronized: ${syncStatus.elections} elections, ${syncStatus.candidates} candidates, ${syncStatus.registrations} registrations.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Blockchain Sync Failed",
        description: error.message || "Failed to sync with blockchain",
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
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CloudSync className="h-4 w-4" />
        )}
        Sync with Blockchain
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Blockchain Synchronization</AlertDialogTitle>
            <AlertDialogDescription>
              This will create all elections and candidates from the database on the blockchain.
              Make sure you have MetaMask installed and connected to Polygon Amoy testnet.
              <br /><br />
              This operation requires multiple transactions and may take some time.
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
            <DialogTitle>Blockchain Synchronization</DialogTitle>
            <DialogDescription>
              {isSyncing ? "Synchronizing data with blockchain..." : "Synchronization complete"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Elections:</span>
                <span className="font-medium">{syncStatus.elections} / {elections?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Candidates:</span>
                <span className="font-medium">{syncStatus.candidates} / {candidates?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Registrations:</span>
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
                Syncing...
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleSync}>
                  <CloudSync className="mr-2 h-4 w-4" />
                  Sync Now
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}