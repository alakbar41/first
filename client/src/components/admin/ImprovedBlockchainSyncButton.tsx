import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { Loader2, Cloud, RotateCw, ServerCog } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import studentIdWeb3Service from "@/lib/student-id-web3-service";
import web3Service from "@/lib/improved-web3-service";
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

interface ImprovedBlockchainSyncButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function ImprovedBlockchainSyncButton({
  variant = "outline",
  size = "sm",
  className = "",
}: ImprovedBlockchainSyncButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { 
    isInitialized,
    isWalletConnected,
    connectWallet
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
  const { data: elections } = useQuery({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await fetch('/api/elections');
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  // Fetch candidates from database
  const { data: candidates } = useQuery({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const response = await fetch('/api/candidates');
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  // Fetch election-candidate relationships
  const { data: electionCandidates } = useQuery({
    queryKey: ['/api/election-candidates'],
    queryFn: async () => {
      const response = await fetch('/api/election-candidates');
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
    enabled: showDialog, // Only fetch when dialog is open
  });

  // Function to get CSRF token
  const getCsrfToken = async (): Promise<string> => {
    try {
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      return csrfData.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new Error('Failed to get CSRF token');
    }
  };

  // Register candidate with student ID on blockchain and update database when successful
  const registerCandidateWithStudentId = async (candidate: any): Promise<number | null> => {
    try {
      console.log(`Registering candidate ${candidate.fullName} with student ID ${candidate.studentId}`);
      
      // First check if this candidate is already registered on blockchain
      try {
        const existingId = await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
        console.log(`Candidate with student ID ${candidate.studentId} already registered with ID ${existingId}`);
        return existingId;
      } catch (error) {
        // If not found, proceed with registration
        console.log(`Candidate with student ID ${candidate.studentId} not found, registering now`);
      }
      
      // Register candidate on blockchain
      const blockchainId = await studentIdWeb3Service.registerCandidate(candidate.studentId);
      console.log(`Successfully registered candidate with student ID ${candidate.studentId} as blockchain ID ${blockchainId}`);
      
      // Update candidate in database with blockchain ID
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/candidates/${candidate.id}/blockchain-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ blockchainId }),
      });
      
      if (!response.ok) {
        console.warn(`Failed to update candidate ${candidate.id} with blockchain ID ${blockchainId} in database`);
      } else {
        console.log(`Updated candidate ${candidate.id} with blockchain ID ${blockchainId} in database`);
      }
      
      return blockchainId;
    } catch (error: any) {
      console.error(`Failed to register candidate ${candidate.fullName} with student ID ${candidate.studentId}:`, error);
      throw error;
    }
  };

  // Deploy an election to blockchain and update database with blockchain ID
  const deployElectionToBlockchain = async (election: any): Promise<number | null> => {
    try {
      // Skip if already has blockchain ID
      if (election.blockchainId) {
        console.log(`Election ${election.id} already has blockchain ID ${election.blockchainId}`);
        return election.blockchainId;
      }
      
      console.log(`Deploying election ${election.name} to blockchain`);
      
      // Convert dates to timestamps
      const startTimestamp = Math.floor(new Date(election.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(election.endDate).getTime() / 1000);
      
      // Map election type
      const electionType = election.position.toLowerCase().includes('president') ? 1 : 0;
      
      // Deploy to blockchain
      const blockchainId = await web3Service.createElection(
        electionType,
        startTimestamp,
        endTimestamp
      );
      
      console.log(`Successfully deployed election ${election.name} as blockchain ID ${blockchainId}`);
      
      // Update election in database with blockchain ID
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/elections/${election.id}/blockchain-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ blockchainId }),
      });
      
      if (!response.ok) {
        console.warn(`Failed to update election ${election.id} with blockchain ID ${blockchainId} in database`);
      } else {
        console.log(`Updated election ${election.id} with blockchain ID ${blockchainId} in database`);
      }
      
      return blockchainId;
    } catch (error: any) {
      console.error(`Failed to deploy election ${election.name}:`, error);
      throw error;
    }
  };

  // Register a candidate for an election on blockchain
  const registerCandidateForElection = async (candidateId: number, electionId: number): Promise<void> => {
    try {
      // Find candidate in our list
      const candidate = candidates?.find(c => c.id === candidateId);
      const election = elections?.find(e => e.id === electionId);
      
      if (!candidate || !election) {
        throw new Error(`Candidate ${candidateId} or election ${electionId} not found`);
      }
      
      console.log(`Registering candidate ${candidate.fullName} for election ${election.name}`);
      
      // Get blockchain IDs
      let blockchainCandidateId: number | null = null;
      let blockchainElectionId: number | null = null;
      
      // Get or register candidate on blockchain
      try {
        blockchainCandidateId = await registerCandidateWithStudentId(candidate);
      } catch (error) {
        console.error(`Failed to register candidate ${candidate.fullName}:`, error);
        throw error;
      }
      
      // Get or deploy election to blockchain
      try {
        blockchainElectionId = await deployElectionToBlockchain(election);
      } catch (error) {
        console.error(`Failed to deploy election ${election.name}:`, error);
        throw error;
      }
      
      if (!blockchainCandidateId || !blockchainElectionId) {
        throw new Error(`Could not get blockchain IDs for candidate ${candidateId} or election ${electionId}`);
      }
      
      // Register candidate for election on blockchain
      await studentIdWeb3Service.registerCandidateForElection(
        blockchainElectionId,
        blockchainCandidateId
      );
      
      console.log(`Successfully registered candidate ${candidate.fullName} for election ${election.name} on blockchain`);
    } catch (error: any) {
      console.error(`Failed to register candidate ${candidateId} for election ${electionId}:`, error);
      throw error;
    }
  };

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

      // 1. Register all candidates on blockchain by student ID
      if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
          try {
            await registerCandidateWithStudentId(candidate);
            
            setSyncStatus(prev => ({ 
              ...prev, 
              candidates: prev.candidates + 1,
              current: prev.current + 1
            }));
          } catch (error: any) {
            console.error(`Failed to register candidate ${candidate.id}:`, error);
            setSyncStatus(prev => ({ 
              ...prev,
              current: prev.current + 1,
              errors: [...prev.errors, `Candidate ${candidate.id} (${candidate.fullName}): ${error.message || 'Failed to register'}`]
            }));
          }
        }
      }

      // 2. Deploy all elections to blockchain
      if (elections && elections.length > 0) {
        for (const election of elections) {
          try {
            await deployElectionToBlockchain(election);
            
            setSyncStatus(prev => ({ 
              ...prev, 
              elections: prev.elections + 1,
              current: prev.current + 1
            }));
          } catch (error: any) {
            console.error(`Failed to deploy election ${election.id}:`, error);
            setSyncStatus(prev => ({ 
              ...prev,
              current: prev.current + 1,
              errors: [...prev.errors, `Election ${election.id} (${election.name}): ${error.message || 'Failed to deploy'}`]
            }));
          }
        }
      }

      // 3. Register all candidates for elections on blockchain
      if (electionCandidates && electionCandidates.length > 0) {
        for (const ec of electionCandidates) {
          try {
            await registerCandidateForElection(ec.candidateId, ec.electionId);
            
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
              errors: [...prev.errors, `Registration for candidate ${ec.candidateId} in election ${ec.electionId}: ${error.message || 'Failed'}`]
            }));
          }
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });

      toast({
        title: "Blockchain Sync Completed",
        description: `Successfully synced ${syncStatus.elections} elections, ${syncStatus.candidates} candidates, and ${syncStatus.registrations} election registrations.`,
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
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RotateCw className="h-4 w-4 mr-2" />
        )}
        SYNC WITH BLOCKCHAIN
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync with Blockchain</AlertDialogTitle>
            <AlertDialogDescription>
              This will perform a full synchronization between your database and the blockchain. 
              The process will:
              
              <ul className="list-disc pl-5 my-2 space-y-1 text-sm">
                <li>Register all candidates on the blockchain with their student IDs</li>
                <li>Deploy all elections to the blockchain</li>
                <li>Register candidates for their respective elections on the blockchain</li>
              </ul>
              
              <p className="mt-2">Make sure you have MetaMask installed and connected to Polygon Amoy testnet.</p>
              <p className="mt-2 font-medium">Are you sure you want to proceed?</p>
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
              {isSyncing ? "Synchronizing with blockchain..." : "Blockchain synchronization complete"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Candidate Registrations:</span>
                <span className="font-medium">{syncStatus.candidates} / {candidates?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Election Deployments:</span>
                <span className="font-medium">{syncStatus.elections} / {elections?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Election-Candidate Registrations:</span>
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
                Synchronizing...
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleSync}>
                  <ServerCog className="mr-2 h-4 w-4" />
                  Start Sync
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}