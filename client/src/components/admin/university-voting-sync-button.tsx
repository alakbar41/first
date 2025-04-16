import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { universityVotingService } from '@/hooks/use-university-voting';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UniversityVotingSyncButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dialog state
  const [open, setOpen] = useState(false);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [syncMessages, setSyncMessages] = useState<{message: string, type: 'info' | 'error' | 'success'}[]>([]);

  // Add a message to the sync log
  const addSyncMessage = (message: string) => {
    setSyncMessages(prev => [...prev, { message, type: 'info' }]);
  };

  // Add a success message to the sync log
  const addSyncSuccess = (message: string) => {
    setSyncMessages(prev => [...prev, { message, type: 'success' }]);
  };

  // Add an error message to the sync log
  const addSyncError = (message: string) => {
    setSyncMessages(prev => [...prev, { message, type: 'error' }]);
  };

  // Helper to get CSRF token
  const getCsrfToken = async (): Promise<string> => {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    return data.csrfToken;
  };

  // Calculate the timestamp for an election
  const getElectionTimestamp = (date: Date): number => {
    return Math.floor(new Date(date).getTime() / 1000);
  };

  // Deploy an election to the blockchain and update the database with the blockchain ID
  const deployElectionToBlockchain = async (election: any): Promise<boolean> => {
    try {
      // Skip if already has blockchainId
      if (election.blockchainId) {
        addSyncSuccess(`Election ${election.name} (ID: ${election.id}) already has blockchain ID ${election.blockchainId}`);
        return true;
      }
      
      addSyncMessage(`Deploying election ${election.name} (ID: ${election.id}) to blockchain...`);
      
      // Convert dates to timestamps
      const startTimestamp = getElectionTimestamp(election.startTime);
      const endTimestamp = getElectionTimestamp(election.endTime);
      
      // Deploy to blockchain
      await universityVotingService.createElection(
        startTimestamp,
        endTimestamp
      );
      
      // Update election in database with blockchain ID (which is the start timestamp)
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/elections/${election.id}/blockchain-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ blockchainId: startTimestamp }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update database with blockchain ID for election ${election.id}`);
      }
      
      addSyncSuccess(`Successfully deployed election ${election.name} with blockchain ID ${startTimestamp}`);
      return true;
    } catch (error: any) {
      // Special handling for "already exists" errors
      if (error.message && error.message.includes('already exists')) {
        addSyncMessage(`Election ${election.name} already exists on blockchain`);
        
        // Try to update the database with the blockchain ID
        try {
          const startTimestamp = getElectionTimestamp(election.startTime);
          const csrfToken = await getCsrfToken();
          await fetch(`/api/elections/${election.id}/blockchain-id`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ blockchainId: startTimestamp }),
          });
          
          addSyncSuccess(`Updated election ${election.name} with blockchain ID ${startTimestamp}`);
          return true;
        } catch (updateError) {
          addSyncError(`Failed to update database for existing election ${election.name}`);
          return false;
        }
      }
      
      addSyncError(`Failed to deploy election ${election.name}: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Add a candidate to an election on the blockchain
  const addCandidateToElection = async (candidate: any, election: any): Promise<boolean> => {
    try {
      // Check if election has a blockchain ID
      if (!election.blockchainId) {
        addSyncError(`Election ${election.name} (ID: ${election.id}) doesn't have a blockchain ID`);
        return false;
      }
      
      addSyncMessage(`Adding candidate ${candidate.fullName} (ID: ${candidate.id}) to election ${election.name}...`);
      
      // Add candidate to election on blockchain
      if (election.position.toLowerCase().includes('president')) {
        // Check if it's a ticket (has a running mate)
        if (candidate.runningMateStudentId) {
          addSyncMessage(`Adding ticket with president ${candidate.studentId} and VP ${candidate.runningMateStudentId}...`);
          await universityVotingService.addTicket(
            election.blockchainId,
            candidate.studentId,
            candidate.runningMateStudentId
          );
          addSyncSuccess(`Added ticket with president ${candidate.studentId} and VP ${candidate.runningMateStudentId} to election ${election.name}`);
        } else {
          // Single candidate
          await universityVotingService.addCandidate(
            election.blockchainId,
            candidate.studentId
          );
          addSyncSuccess(`Added candidate ${candidate.fullName} (studentId: ${candidate.studentId}) to election ${election.name}`);
        }
      } else {
        // Senate election - single candidate
        await universityVotingService.addCandidate(
          election.blockchainId,
          candidate.studentId
        );
        addSyncSuccess(`Added candidate ${candidate.fullName} (studentId: ${candidate.studentId}) to election ${election.name}`);
      }
      
      // Update candidate in database with blockchain ID (if needed)
      if (!candidate.blockchainId) {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/candidates/${candidate.id}/blockchain-id`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ blockchainId: candidate.studentId }),
        });
        
        if (!response.ok) {
          addSyncError(`Failed to update database with blockchain ID for candidate ${candidate.id}`);
        }
      }
      
      return true;
    } catch (error: any) {
      // Special handling for "already added" errors
      if (error.message && error.message.includes('already added')) {
        addSyncMessage(`Candidate ${candidate.fullName} already added to election ${election.name}`);
        return true;
      }
      
      addSyncError(`Failed to add candidate ${candidate.fullName} to election ${election.name}: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  // Start the syncing process
  const startSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStep(0);
      setProgressPercent(0);
      setSyncMessages([]);
      
      // Initialize the web3 service
      addSyncMessage('Initializing connection to blockchain...');
      const initialized = await universityVotingService.initializeIfNeeded();
      
      if (!initialized) {
        throw new Error('Failed to initialize blockchain connection');
      }
      
      // Connect wallet if not connected
      if (!universityVotingService.isWalletConnected()) {
        addSyncMessage('Connecting to wallet...');
        await universityVotingService.connectWallet();
        addSyncSuccess('Wallet connected successfully');
      } else {
        addSyncSuccess('Wallet already connected');
      }
      
      // Step 1: Fetch elections
      setSyncStep(1);
      setProgressPercent(5);
      addSyncMessage('Fetching elections from database...');
      
      const electionsResponse = await fetch('/api/elections');
      if (!electionsResponse.ok) {
        throw new Error('Failed to fetch elections');
      }
      
      const elections = await electionsResponse.json();
      
      if (elections.length === 0) {
        addSyncMessage('No elections found in database');
        setProgressPercent(100);
        setIsSyncing(false);
        return;
      }
      
      addSyncSuccess(`Found ${elections.length} elections`);
      
      // Step 2: Deploy elections to blockchain
      setSyncStep(2);
      setProgressPercent(10);
      addSyncMessage('Deploying elections to blockchain...');
      
      for (let i = 0; i < elections.length; i++) {
        await deployElectionToBlockchain(elections[i]);
        setProgressPercent(10 + Math.floor((i + 1) / elections.length * 40));
      }
      
      // Step 3: Fetch candidates for each election
      setSyncStep(3);
      setProgressPercent(50);
      addSyncMessage('Fetching candidates for elections...');
      
      for (let i = 0; i < elections.length; i++) {
        const election = elections[i];
        
        addSyncMessage(`Fetching candidates for election ${election.name}...`);
        
        const candidatesResponse = await fetch(`/api/elections/${election.id}/candidates`);
        if (!candidatesResponse.ok) {
          addSyncError(`Failed to fetch candidates for election ${election.name}`);
          continue;
        }
        
        const candidates = await candidatesResponse.json();
        
        if (candidates.length === 0) {
          addSyncMessage(`No candidates found for election ${election.name}`);
          continue;
        }
        
        addSyncSuccess(`Found ${candidates.length} candidates for election ${election.name}`);
        
        // Step 4: Add candidates to elections on blockchain
        for (let j = 0; j < candidates.length; j++) {
          await addCandidateToElection(candidates[j], election);
        }
        
        setProgressPercent(50 + Math.floor((i + 1) / elections.length * 50));
      }
      
      // Final step: Complete
      setSyncStep(4);
      setProgressPercent(100);
      addSyncSuccess('Blockchain synchronization complete!');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/elections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      
      toast({
        title: 'Blockchain Sync Complete',
        description: 'Elections and candidates have been synchronized with the blockchain',
        variant: 'success'
      });
    } catch (error: any) {
      addSyncError(`Sync failed: ${error.message || 'Unknown error'}`);
      
      toast({
        title: 'Blockchain Sync Failed',
        description: error.message || 'An error occurred during synchronization',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full"
          onClick={() => setOpen(true)}
        >
          Sync with Blockchain (New)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Blockchain Synchronization</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <div>
                {syncStep === 0 && 'Initializing...'}
                {syncStep === 1 && 'Fetching elections...'}
                {syncStep === 2 && 'Deploying elections to blockchain...'}
                {syncStep === 3 && 'Adding candidates to elections...'}
                {syncStep === 4 && 'Complete'}
              </div>
              <div>{progressPercent}%</div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {/* Sync log */}
          <div className="border rounded-md">
            <ScrollArea className="h-64 p-4">
              <div className="space-y-2">
                {syncMessages.map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    {msg.type === 'info' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0 mt-0.5" />}
                    {msg.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />}
                    {msg.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                    <span className={
                      msg.type === 'info' ? 'text-gray-700' : 
                      msg.type === 'success' ? 'text-green-700' : 
                      'text-red-700'
                    }>
                      {msg.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSyncing}
            >
              Close
            </Button>
            <Button
              onClick={startSync}
              disabled={isSyncing}
              className="min-w-24"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : 'Start Sync'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}