import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { Loader2, PlayCircle } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { ElectionStatus } from '@/lib/improved-web3-service';

interface ActivateElectionButtonProps {
  electionId: number;
  blockchainId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onSuccess?: () => void;
}

export function ActivateElectionButton({ 
  electionId,
  blockchainId,
  variant = "default", 
  size = "default",
  className = "",
  onSuccess
}: ActivateElectionButtonProps) {
  const { isInitialized, connectWallet, isWalletConnected } = useWeb3();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isActivating, setIsActivating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  
  // Check the current blockchain status first
  const checkCurrentStatus = async () => {
    if (!blockchainId || !isInitialized) return null;
    
    setIsChecking(true);
    try {
      const details = await web3Service.getElectionDetails(blockchainId);
      setCurrentStatus(details.status);
      return details.status;
    } catch (error) {
      console.error("Error checking election status:", error);
      return null;
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleActivate = async () => {
    if (!blockchainId) {
      toast({
        title: "Not Deployed",
        description: "This election must be deployed to the blockchain first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isInitialized) {
      toast({
        title: "Web3 Not Initialized",
        description: "The blockchain connection is not available yet. Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Connect wallet if not connected
    if (!isWalletConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet Connection Required",
          description: "Please connect your wallet to activate this election.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Check current status before attempting activation
    setIsActivating(true);
    const status = await checkCurrentStatus();
    
    // If already active or completed, notify user
    if (status === ElectionStatus.Active) {
      toast({
        title: "Already Active",
        description: "This election is already active on the blockchain.",
        variant: "default",
      });
      setIsActivating(false);
      return;
    }
    
    if (status === ElectionStatus.Completed) {
      toast({
        title: "Election Completed",
        description: "This election has already ended and cannot be activated.",
        variant: "destructive",
      });
      setIsActivating(false);
      return;
    }
    
    // Only proceed with activation if the election is in pending status
    if (status === ElectionStatus.Pending) {
      try {
        // Call the smart contract to start the election
        await web3Service.startElection(blockchainId);
        
        toast({
          title: "Election Activated",
          description: "The election has been successfully activated on the blockchain. Voting is now open.",
          variant: "default",
        });
        
        // Invalidate related queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
        queryClient.invalidateQueries({ queryKey: [`/api/elections/${electionId}`] });
        
        // Call success callback if provided
        if (onSuccess) onSuccess();
        
      } catch (error: any) {
        console.error("Failed to activate election:", error);
        
        if (error.message && error.message.includes("user rejected")) {
          toast({
            title: "Transaction Rejected",
            description: "You rejected the activation transaction. The election remains in pending state.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Activation Failed",
            description: error.message || "Failed to activate election on the blockchain.",
            variant: "destructive",
          });
        }
      } finally {
        setIsActivating(false);
      }
    } else {
      toast({
        title: "Cannot Activate",
        description: `The election has an unexpected status (${status}) and cannot be activated.`,
        variant: "destructive",
      });
      setIsActivating(false);
    }
  };
  
  if (isActivating || isChecking) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={true}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>{isChecking ? "Checking Status..." : "Activating..."}</span>
      </Button>
    );
  }
  
  // For elections that are already active, show a disabled button
  if (currentStatus === ElectionStatus.Active) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} bg-green-50 text-green-700 border-green-200`}
        disabled={true}
      >
        <PlayCircle className="mr-2 h-4 w-4" />
        <span>Already Active</span>
      </Button>
    );
  }
  
  // For elections that have completed or cancelled, show nothing at all
  if (currentStatus === ElectionStatus.Completed || currentStatus === ElectionStatus.Cancelled) {
    return null;
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleActivate}
    >
      <PlayCircle className="mr-2 h-4 w-4" />
      <span>Activate Election</span>
    </Button>
  );
}