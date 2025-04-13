import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import { mapElectionFromWeb2ToWeb3 } from '@/lib/enhanced-blockchain-id-mapping';
import { Loader2 } from 'lucide-react';
import studentIdWeb3Service from '@/lib/student-id-web3-service';

interface EnhancedAutoUpdateElectionStatusButtonProps {
  electionId: number;
  currentStatus: string;
  startTime: string;
  endTime: string;
  onUpdateSuccess?: () => void;
  className?: string;
}

export function EnhancedAutoUpdateElectionStatusButton({
  electionId,
  currentStatus,
  startTime,
  endTime,
  onUpdateSuccess,
  className = ''
}: EnhancedAutoUpdateElectionStatusButtonProps) {
  const { toast } = useToast();
  const { isInitialized, walletAddress, connectWallet } = useStudentIdWeb3();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Calculate the expected status based on time
  const calculateExpectedStatus = (): string => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (now < start) return 'Pending';
    if (now >= start && now <= end) return 'Active';
    return 'Completed';
  };
  
  const expectedStatus = calculateExpectedStatus();
  const needsUpdate = currentStatus !== expectedStatus;
  
  const handleUpdateStatus = async () => {
    try {
      setIsUpdating(true);
      
      // Check if wallet connected, if not try to connect
      if (!walletAddress) {
        console.log('No wallet connected, attempting to connect...');
        try {
          await connectWallet();
        } catch (error: any) {
          toast({
            title: 'Wallet Connection Failed',
            description: error.message || 'Could not connect to your wallet.',
            variant: 'destructive'
          });
          setIsUpdating(false);
          return;
        }
      }
      
      // Map the Web2 election ID to the Web3 blockchain ID
      const blockchainElectionId = await mapElectionFromWeb2ToWeb3(electionId);
      
      if (!blockchainElectionId) {
        toast({
          title: "Election Not Found",
          description: "This election could not be found on the blockchain.",
          variant: "destructive"
        });
        setIsUpdating(false);
        return;
      }
      
      // Call the auto-update function in the smart contract
      console.log(`Auto-updating election ${electionId} (blockchain ID: ${blockchainElectionId})...`);
      const tx = await studentIdWeb3Service.autoUpdateElectionStatus(blockchainElectionId);
      
      // Update in the database to match blockchain
      const updateResponse = await apiRequest('PATCH', `/api/elections/${electionId}`, {
        status: expectedStatus
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to update election status in database: ${updateResponse.statusText}`);
      }
      
      toast({
        title: "Status Updated",
        description: `Election status updated to ${expectedStatus}.`,
      });
      
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (error: any) {
      console.error('Status update failed:', error);
      
      let errorMessage = error.message || 'An unknown error occurred';
      // Extract MetaMask/Ethers error message if available
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      toast({
        title: "Status Update Failed",
        description: `${errorMessage}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
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
    <Button
      variant={needsUpdate ? "default" : "outline"}
      className={className}
      disabled={isUpdating || !needsUpdate}
      onClick={handleUpdateStatus}
    >
      {isUpdating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : needsUpdate ? (
        `Update to ${expectedStatus}`
      ) : (
        "Status Current"
      )}
    </Button>
  );
}