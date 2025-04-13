import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import studentIdWeb3Service from '@/lib/student-id-web3-service';
import { mapElectionFromWeb2ToWeb3, mapCandidateFromWeb2ToWeb3 } from '@/lib/enhanced-blockchain-id-mapping';
import { Loader2, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface EnhancedBlockchainSyncButtonProps {
  onSyncComplete?: () => void;
  className?: string;
}

export function EnhancedBlockchainSyncButton({
  onSyncComplete,
  className = ''
}: EnhancedBlockchainSyncButtonProps) {
  const { toast } = useToast();
  const { isInitialized, walletAddress, connectWallet } = useStudentIdWeb3();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  
  const handleSync = async () => {
    try {
      // Reset state
      setIsSyncing(true);
      setShowDialog(true);
      setProgress(0);
      setStatusMessage('Preparing for synchronization...');
      setErrors([]);
      
      // Check if wallet connected, if not try to connect
      if (!walletAddress) {
        setStatusMessage('Connecting to wallet...');
        try {
          await connectWallet();
        } catch (error: any) {
          addError(`Wallet connection failed: ${error.message || 'Unknown error'}`);
          setStatusMessage('Failed to connect wallet');
          return;
        }
      }
      
      // Step 1: Fetch all elections
      setStatusMessage('Fetching elections from database...');
      setProgress(10);
      const electionsResponse = await apiRequest('GET', '/api/elections');
      if (!electionsResponse.ok) {
        throw new Error('Failed to fetch elections from database');
      }
      const elections = await electionsResponse.json();
      
      // Step 2: Fetch all candidates
      setStatusMessage('Fetching candidates from database...');
      setProgress(20);
      const candidatesResponse = await apiRequest('GET', '/api/candidates');
      if (!candidatesResponse.ok) {
        throw new Error('Failed to fetch candidates from database');
      }
      const candidates = await candidatesResponse.json();
      
      // Step 3: Register missing candidates on blockchain
      setStatusMessage('Registering candidates on blockchain...');
      setProgress(30);
      let registeredCount = 0;
      for (const candidate of candidates) {
        // Skip candidates without student IDs
        if (!candidate.studentId) {
          addError(`Candidate ID ${candidate.id} has no student ID, skipping`);
          continue;
        }
        
        try {
          // Try to get candidate by student ID to check if it exists
          await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
          // If no error is thrown, candidate exists
        } catch (error) {
          // If error, candidate doesn't exist on blockchain, so register it
          try {
            const blockchainCandidateId = await studentIdWeb3Service.registerCandidate(candidate.studentId);
            registeredCount++;
            setStatusMessage(`Registered candidate with student ID ${candidate.studentId} (${registeredCount}/${candidates.length})`);
          } catch (regError: any) {
            addError(`Failed to register candidate ${candidate.id} (${candidate.studentId}): ${regError.message}`);
          }
        }
        
        // Update progress
        setProgress(30 + Math.floor((registeredCount / candidates.length) * 20));
      }
      
      // Step 4: Check and create missing elections on blockchain
      setStatusMessage('Synchronizing elections to blockchain...');
      setProgress(50);
      let syncedElectionCount = 0;
      for (const election of elections) {
        try {
          // Skip elections without timestamps
          if (!election.startTime || !election.endTime) {
            addError(`Election ID ${election.id} is missing start/end time, skipping`);
            continue;
          }
          
          // Convert database timestamp to Unix timestamp (seconds)
          const startTimestamp = Math.floor(new Date(election.startTime).getTime() / 1000);
          const endTimestamp = Math.floor(new Date(election.endTime).getTime() / 1000);
          
          // Try to map election to see if it exists on blockchain
          const blockchainElectionId = await mapElectionFromWeb2ToWeb3(election.id);
          
          if (!blockchainElectionId) {
            // Election doesn't exist on blockchain, create it
            try {
              // Determine election type (0 for Senator, 1 for PresidentVP)
              const electionType = election.type === 'President/VP' ? 1 : 0;
              
              const createdElectionId = await studentIdWeb3Service.createElection(
                electionType,
                startTimestamp,
                endTimestamp
              );
              
              syncedElectionCount++;
              setStatusMessage(`Created election ${election.name} on blockchain with ID ${createdElectionId}`);
            } catch (createError: any) {
              addError(`Failed to create election ${election.id} on blockchain: ${createError.message}`);
            }
          } else {
            // Auto-update election status based on time
            try {
              await studentIdWeb3Service.autoUpdateElectionStatus(blockchainElectionId);
              syncedElectionCount++;
              setStatusMessage(`Updated status for election ${election.name}`);
            } catch (updateError: any) {
              addError(`Failed to update election ${election.id} status: ${updateError.message}`);
            }
          }
        } catch (electionError: any) {
          addError(`Error processing election ${election.id}: ${electionError.message}`);
        }
        
        // Update progress
        setProgress(50 + Math.floor((syncedElectionCount / elections.length) * 30));
      }
      
      // Step 5: Link candidates to elections on blockchain
      setStatusMessage('Linking candidates to elections...');
      setProgress(80);
      
      // Fetch election-candidate relations
      const electionCandidatesResponse = await apiRequest('GET', '/api/election-candidates');
      if (!electionCandidatesResponse.ok) {
        throw new Error('Failed to fetch election-candidate relations');
      }
      
      const electionCandidates = await electionCandidatesResponse.json();
      let linkedCount = 0;
      
      for (const relation of electionCandidates) {
        try {
          // Map IDs from database to blockchain
          const blockchainElectionId = await mapElectionFromWeb2ToWeb3(relation.electionId);
          const blockchainCandidateId = await mapCandidateFromWeb2ToWeb3(relation.candidateId);
          
          if (!blockchainElectionId || !blockchainCandidateId) {
            addError(`Could not map election ${relation.electionId} or candidate ${relation.candidateId} to blockchain IDs`);
            continue;
          }
          
          // Add candidate to election on blockchain
          try {
            // Check if the election exists
            const electionInfo = await studentIdWeb3Service.getElectionDetails(blockchainElectionId);
            
            // Only try to add candidates if election is in pending state
            if (Number(electionInfo.status) === 0) { // 0 = Pending
              await studentIdWeb3Service.addCandidateToElection(blockchainElectionId, blockchainCandidateId);
              linkedCount++;
              setStatusMessage(`Linked candidate ${relation.candidateId} to election ${relation.electionId}`);
            } else {
              // Skip adding candidates to active or completed elections
              addError(`Cannot add candidate to election ${relation.electionId} as it's not in pending state`);
            }
          } catch (linkError: any) {
            // If error message contains "already added", this is actually fine
            if (linkError.message && linkError.message.includes("already added")) {
              linkedCount++;
              setStatusMessage(`Candidate ${relation.candidateId} already linked to election ${relation.electionId}`);
            } else {
              addError(`Failed to link candidate ${relation.candidateId} to election ${relation.electionId}: ${linkError.message}`);
            }
          }
        } catch (relationError: any) {
          addError(`Error processing relation between election ${relation.electionId} and candidate ${relation.candidateId}: ${relationError.message}`);
        }
        
        // Update progress
        setProgress(80 + Math.floor((linkedCount / electionCandidates.length) * 20));
      }
      
      // Sync complete
      setProgress(100);
      setStatusMessage('Synchronization complete!');
      
      toast({
        title: "Blockchain Sync Complete",
        description: `Successfully synchronized ${syncedElectionCount} elections and ${registeredCount} candidates.`,
      });
      
      if (onSyncComplete) onSyncComplete();
    } catch (error: any) {
      console.error('Sync failed:', error);
      addError(`Synchronization failed: ${error.message}`);
      
      toast({
        title: "Sync Failed",
        description: error.message || "An unknown error occurred during synchronization.",
        variant: "destructive"
      });
    } finally {
      // Keep dialog open to show errors if any, but mark as not syncing
      setIsSyncing(false);
    }
  };
  
  const addError = (error: string) => {
    setErrors(prev => [...prev, error]);
  };
  
  if (!isInitialized) {
    return (
      <Button 
        variant="outline" 
        className={className}
        disabled
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }
  
  return (
    <>
      <Button
        variant="outline"
        className={className}
        disabled={isSyncing}
        onClick={handleSync}
      >
        {isSyncing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Sync to Blockchain
          </>
        )}
      </Button>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Blockchain Synchronization</DialogTitle>
            <DialogDescription>
              Synchronizing Web2 database with Web3 blockchain
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="text-sm font-medium">
              {statusMessage}
            </div>
            
            {errors.length > 0 && (
              <div className="text-sm border rounded-md p-4 bg-muted/50 max-h-40 overflow-y-auto">
                <p className="font-semibold text-destructive mb-2">Errors ({errors.length}):</p>
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index} className="text-xs text-destructive">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : (progress === 100 ? 'Close' : 'Cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}