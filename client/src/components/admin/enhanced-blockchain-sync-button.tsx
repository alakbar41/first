import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import studentIdWeb3Service from '@/lib/student-id-web3-service';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Election, Candidate } from '@shared/schema';
import { ElectionType } from '@/lib/student-id-web3-service';

interface EnhancedBlockchainSyncButtonProps {
  className?: string;
}

export function EnhancedBlockchainSyncButton({ className = '' }: EnhancedBlockchainSyncButtonProps) {
  const { toast } = useToast();
  const { isInitialized, walletAddress } = useStudentIdWeb3();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [syncingStep, setSyncingStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [syncMessages, setSyncMessages] = useState<string[]>([]);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [candidateIdMap, setCandidateIdMap] = useState<Record<number, number>>({});
  
  // Query for elections
  const { data: elections, isLoading: isLoadingElections } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    },
    enabled: isDialogOpen,
  });
  
  // Query for candidates
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
    queryFn: async () => {
      const response = await fetch("/api/candidates");
      if (!response.ok) throw new Error("Failed to fetch candidates");
      return response.json();
    },
    enabled: isDialogOpen,
  });
  
  // Sync function
  const startSync = async () => {
    if (!isInitialized || !walletAddress) {
      toast({
        title: "Cannot Sync",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }
    
    if (!elections || !candidates) {
      toast({
        title: "Cannot Sync",
        description: "Unable to load elections or candidates data",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSyncing(true);
      setSyncingStep(1);
      setProgressPercent(10);
      setSyncMessages([]);
      setSyncErrors([]);
      setCandidateIdMap({});
      
      // Step 1: Register candidates
      addSyncMessage("Registering candidates on blockchain...");
      
      const candidateMap: Record<number, number> = {};
      const totalCandidates = candidates.length;
      
      for (let i = 0; i < totalCandidates; i++) {
        const candidate = candidates[i];
        
        try {
          // First check if candidate already exists
          let blockchainCandidateId: number;
          
          try {
            blockchainCandidateId = await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
            
            if (blockchainCandidateId > 0) {
              candidateMap[candidate.id] = blockchainCandidateId;
              addSyncMessage(`Candidate ${candidate.fullName} (ID: ${candidate.id}) already exists on blockchain with ID ${blockchainCandidateId}`);
              continue;
            }
          } catch (error) {
            console.log(`Candidate ${candidate.studentId} not found on blockchain, registering...`);
          }
          
          // Register candidate
          blockchainCandidateId = await studentIdWeb3Service.registerCandidate(candidate.studentId);
          candidateMap[candidate.id] = blockchainCandidateId;
          
          addSyncMessage(`Registered candidate ${candidate.fullName} (ID: ${candidate.id}) with blockchain ID ${blockchainCandidateId}`);
          
          // Update progress
          setProgressPercent(10 + Math.floor((i / totalCandidates) * 40));
        } catch (error: any) {
          addSyncError(`Failed to register candidate ${candidate.fullName}: ${error.message || error}`);
        }
      }
      
      setCandidateIdMap(candidateMap);
      
      // Step 2: Create elections
      setSyncingStep(2);
      setProgressPercent(50);
      addSyncMessage("Creating elections on blockchain...");
      
      const totalElections = elections.length;
      
      for (let i = 0; i < totalElections; i++) {
        const election = elections[i];
        
        try {
          // Convert position to ElectionType
          const electionType = election.position === 'Senator' ? ElectionType.Senator : ElectionType.PresidentVP;
          
          // Create election on blockchain
          const startTime = Math.floor(new Date(election.startDate).getTime() / 1000);
          const endTime = Math.floor(new Date(election.endDate).getTime() / 1000);
          
          const blockchainElectionId = election.id; // Use the same ID for simplicity
          
          addSyncMessage(`Creating election "${election.name}" (ID: ${election.id}) on blockchain...`);
          
          await studentIdWeb3Service.createElection(
            electionType,
            startTime,
            endTime
          );
          
          addSyncMessage(`Created election "${election.name}" (ID: ${election.id}) on blockchain`);
          
          // Update progress
          setProgressPercent(50 + Math.floor((i / totalElections) * 25));
        } catch (error: any) {
          // Check if error message contains "already exists"
          if (error.message && error.message.toLowerCase().includes("already exists")) {
            addSyncMessage(`Election "${election.name}" (ID: ${election.id}) already exists on blockchain`);
          } else {
            addSyncError(`Failed to create election "${election.name}": ${error.message || error}`);
          }
        }
      }
      
      // Step 3: Link candidates to elections
      setSyncingStep(3);
      setProgressPercent(75);
      addSyncMessage("Linking candidates to elections...");
      
      for (let i = 0; i < totalElections; i++) {
        const election = elections[i];
        
        try {
          // Fetch candidates for this election
          const response = await fetch(`/api/elections/${election.id}/candidates`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch candidates for election ${election.id}`);
          }
          
          const electionCandidates = await response.json();
          
          for (const candidate of electionCandidates) {
            const blockchainCandidateId = candidateMap[candidate.id];
            
            if (!blockchainCandidateId) {
              addSyncError(`No blockchain mapping for candidate ${candidate.fullName} (ID: ${candidate.id})`);
              continue;
            }
            
            try {
              addSyncMessage(`Adding candidate ${candidate.fullName} (ID: ${candidate.id}) to election "${election.name}" (ID: ${election.id})...`);
              
              await studentIdWeb3Service.addCandidateToElection(election.id, blockchainCandidateId);
              
              addSyncMessage(`Added candidate ${candidate.fullName} to election "${election.name}"`);
            } catch (error: any) {
              // Check if error contains "already added"
              if (error.message && error.message.toLowerCase().includes("already added")) {
                addSyncMessage(`Candidate ${candidate.fullName} already added to election "${election.name}"`);
              } else {
                addSyncError(`Failed to add candidate ${candidate.fullName} to election "${election.name}": ${error.message || error}`);
              }
            }
          }
          
          // Update progress
          setProgressPercent(75 + Math.floor((i / totalElections) * 25));
        } catch (error: any) {
          addSyncError(`Failed to link candidates for election "${election.name}": ${error.message || error}`);
        }
      }
      
      setSyncingStep(4);
      setProgressPercent(100);
      addSyncMessage("Synchronization completed!");
      
      toast({
        title: "Sync Completed",
        description: syncErrors.length ? "Completed with some errors. See details." : "All items synchronized successfully",
        variant: syncErrors.length ? "destructive" : "default"
      });
      
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      addSyncError(`Sync failed: ${error.message || error}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const addSyncMessage = (message: string) => {
    setSyncMessages(prev => [...prev, message]);
  };
  
  const addSyncError = (error: string) => {
    setSyncErrors(prev => [...prev, error]);
  };
  
  const syncButtonText = () => {
    if (!isInitialized) return "Connect Wallet to Sync";
    if (isSyncing) return "Syncing...";
    return "Synchronize with Blockchain";
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className={cn("bg-purple-600 hover:bg-purple-700", className)}
          onClick={() => {
            if (!isInitialized) {
              toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet first",
                variant: "destructive"
              });
            } else {
              setIsDialogOpen(true);
            }
          }}
          disabled={isSyncing || !isInitialized}
        >
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {syncButtonText()}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Blockchain Synchronization</DialogTitle>
          <DialogDescription>
            Sync elections and candidates from the database to the blockchain
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {isLoadingElections || isLoadingCandidates ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading data...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Database Summary</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted p-2 rounded flex justify-between">
                    <span>Elections:</span>
                    <Badge variant="outline">{elections?.length || 0}</Badge>
                  </div>
                  <div className="bg-muted p-2 rounded flex justify-between">
                    <span>Candidates:</span>
                    <Badge variant="outline">{candidates?.length || 0}</Badge>
                  </div>
                </div>
              </div>
              
              {isSyncing && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sync Progress</h4>
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Step {syncingStep} of 4</span>
                    <span>{progressPercent}%</span>
                  </div>
                </div>
              )}
              
              {(syncMessages.length > 0 || syncErrors.length > 0) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Sync Log</h4>
                  <div className="bg-muted rounded-md p-2 text-xs font-mono h-48 overflow-y-auto">
                    {syncMessages.map((message, index) => (
                      <div key={`msg-${index}`} className="text-slate-700 dark:text-slate-300">
                        <span className="text-green-600 dark:text-green-400">✓</span> {message}
                      </div>
                    ))}
                    {syncErrors.map((error, index) => (
                      <div key={`err-${index}`} className="text-red-600 dark:text-red-400">
                        <span>✗</span> {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {syncErrors.length > 0 && !isSyncing && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">Warning</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {syncErrors.length} error(s) occurred during synchronization. Some items may not have been properly synchronized.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <DialogFooter>
          {!isSyncing && (
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          )}
          
          <Button
            onClick={startSync}
            disabled={isSyncing || isLoadingElections || isLoadingCandidates}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Start Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}