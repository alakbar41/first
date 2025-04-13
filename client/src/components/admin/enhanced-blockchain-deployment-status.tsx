import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import studentIdWeb3Service from '@/lib/student-id-web3-service';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon, AlertTriangleIcon, Loader2 } from 'lucide-react';

export function EnhancedBlockchainDeploymentStatus() {
  const { toast } = useToast();
  const { isInitialized, walletAddress, connectWallet } = useStudentIdWeb3();
  
  const [contractStatus, setContractStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isElectionManager, setIsElectionManager] = useState(false);
  const [isVoterManager, setIsVoterManager] = useState(false);
  const [electionCount, setElectionCount] = useState<number | null>(null);
  const [candidateCount, setCandidateCount] = useState<number | null>(null);
  
  useEffect(() => {
    if (isInitialized) {
      checkContractStatus();
    } else {
      setContractStatus('disconnected');
    }
  }, [isInitialized, walletAddress]);
  
  const checkContractStatus = async () => {
    try {
      setContractStatus('checking');
      
      if (!walletAddress) {
        setContractStatus('disconnected');
        return;
      }
      
      // Check for roles
      const [admin, electionManager, voterManager] = await Promise.all([
        studentIdWeb3Service.isAdmin(),
        studentIdWeb3Service.isElectionManager(),
        studentIdWeb3Service.isVoterManager()
      ]);
      
      setIsAdmin(admin);
      setIsElectionManager(electionManager);
      setIsVoterManager(voterManager);
      
      // Get blockchain data (where available)
      try {
        // Try to get election count
        const electionCountCall = await studentIdWeb3Service.contract.getElectionCount();
        setElectionCount(Number(electionCountCall));
      } catch (error) {
        console.error('Failed to get election count:', error);
        setElectionCount(null);
      }
      
      try {
        // Try to get candidate count
        const candidateCountCall = await studentIdWeb3Service.contract.getCandidateCount();
        setCandidateCount(Number(candidateCountCall));
      } catch (error) {
        console.error('Failed to get candidate count:', error);
        setCandidateCount(null);
      }
      
      setContractStatus('connected');
    } catch (error) {
      console.error('Failed to check contract status:', error);
      setContractStatus('disconnected');
    }
  };
  
  const renderStatusBadge = () => {
    if (contractStatus === 'checking') {
      return (
        <Badge variant="outline" className="bg-muted">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Checking
        </Badge>
      );
    } else if (contractStatus === 'connected') {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckIcon className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XIcon className="mr-1 h-3 w-3" />
          Disconnected
        </Badge>
      );
    }
  };
  
  const renderRoleStatus = () => {
    return (
      <div className="flex flex-wrap gap-2">
        <Badge variant={isAdmin ? "default" : "outline"} className={isAdmin ? "bg-green-600" : ""}>
          Admin
        </Badge>
        <Badge variant={isElectionManager ? "default" : "outline"} className={isElectionManager ? "bg-blue-600" : ""}>
          Election Manager
        </Badge>
        <Badge variant={isVoterManager ? "default" : "outline"} className={isVoterManager ? "bg-purple-600" : ""}>
          Voter Manager
        </Badge>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex flex-col justify-between">
          <div className="mb-2">
            <p className="text-sm font-medium">Contract Status</p>
            <div className="mt-1">
              {renderStatusBadge()}
            </div>
          </div>
          
          {contractStatus === 'connected' && (
            <p className="text-xs text-muted-foreground mt-2">
              Connected to Polygon Amoy
            </p>
          )}
          
          {contractStatus === 'disconnected' && (
            <p className="text-xs text-destructive mt-2">
              <AlertTriangleIcon className="inline h-3 w-3 mr-1" />
              Wallet connection required
            </p>
          )}
        </Card>
        
        <Card className="p-4 flex flex-col justify-between">
          <div className="mb-2">
            <p className="text-sm font-medium">Your Roles</p>
            <div className="mt-1">
              {contractStatus === 'connected' ? renderRoleStatus() : (
                <p className="text-xs text-muted-foreground">
                  Connect wallet to view roles
                </p>
              )}
            </div>
          </div>
          
          {contractStatus === 'connected' && !isAdmin && !isElectionManager && !isVoterManager && (
            <p className="text-xs text-amber-600 mt-2">
              <AlertTriangleIcon className="inline h-3 w-3 mr-1" />
              No admin roles assigned
            </p>
          )}
        </Card>
        
        <Card className="p-4 flex flex-col justify-between">
          <div className="mb-2">
            <p className="text-sm font-medium">Blockchain Records</p>
            <div className="mt-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs">Elections</span>
                <Badge variant="outline">
                  {electionCount !== null ? electionCount : '-'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Candidates</span>
                <Badge variant="outline">
                  {candidateCount !== null ? candidateCount : '-'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}