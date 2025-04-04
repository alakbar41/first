import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { Loader2, Play, Clock, CalendarClock } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

interface UpdateBlockchainStatusButtonProps {
  electionId: number;
  blockchainId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onSuccess?: () => void;
}

export function UpdateBlockchainStatusButton({ 
  electionId,
  blockchainId,
  variant = "outline", 
  size = "sm",
  className = "",
  onSuccess
}: UpdateBlockchainStatusButtonProps) {
  const { isInitialized, connectWallet, isWalletConnected } = useWeb3();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleUpdate = async () => {
    if (!blockchainId) {
      toast({
        title: "Not deployed",
        description: "This election is not yet deployed to the blockchain.",
        variant: "destructive"
      });
      return;
    }
    
    if (!isInitialized) {
      toast({
        title: "Web3 not initialized",
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
          description: "Please connect your wallet to update election status.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsUpdating(true);
    
    try {
      // First verify the current election status
      const electionDetails = await web3Service.getElectionDetails(blockchainId);
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Determine what status update will happen
      let actionDescription = "";
      if (electionDetails.status === 0) {
        if (currentTime >= electionDetails.startTime && currentTime <= electionDetails.endTime) {
          actionDescription = "This will change the election status from 'Not Started' to 'Voting Active'";
        } else if (currentTime < electionDetails.startTime) {
          actionDescription = "This election's start time has not been reached yet. No status change needed.";
        } else {
          actionDescription = "This election's time period has passed. It will be marked as completed.";
        }
      } else if (electionDetails.status === 1) {
        if (currentTime > electionDetails.endTime) {
          actionDescription = "This will change the election status from 'Voting Active' to 'Voting Ended'";
        } else {
          actionDescription = "The election is already active. No status change needed.";
        }
      } else {
        actionDescription = "The election is already completed. No status change possible.";
      }
      
      // Show what's going to happen
      toast({
        title: "Updating Blockchain Status",
        description: actionDescription,
        duration: 5000,
      });
      
      // Try to auto-update the election status
      await web3Service.autoUpdateElectionStatus(blockchainId);
      
      toast({
        title: "Status Updated",
        description: "The election status has been updated on the blockchain.",
        variant: "default",
      });
      
      // Invalidate related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      queryClient.invalidateQueries({ queryKey: [`/api/elections/${electionId}`] });
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error("Failed to update election status:", error);
      
      if (error.message && error.message.includes("user rejected")) {
        toast({
          title: "Transaction Rejected",
          description: "You rejected the status update transaction. Please try again if you want to update the status.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Status Update Failed",
          description: error.message || "Failed to update election status on the blockchain.",
          variant: "destructive",
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (isUpdating) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={true}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span>Updating Status...</span>
      </Button>
    );
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleUpdate}
      title="This syncs the election status on the blockchain based on its start/end times"
    >
      <CalendarClock className="mr-2 h-4 w-4" />
      <span>Sync Timeline</span>
    </Button>
  );
}