import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { Loader2, Play } from "lucide-react";
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
    >
      <Play className="mr-2 h-4 w-4" />
      <span>Update Status</span>
    </Button>
  );
}