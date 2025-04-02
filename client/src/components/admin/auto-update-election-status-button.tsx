import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { Loader2, RefreshCw } from "lucide-react";
import { autoUpdateElectionStatus } from '@/lib/improved-blockchain-integration';

interface AutoUpdateElectionStatusButtonProps {
  electionId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  onSuccess?: () => void;
}

export function AutoUpdateElectionStatusButton({ 
  electionId,
  variant = "outline",
  size = "sm",
  className = "",
  onSuccess
}: AutoUpdateElectionStatusButtonProps) {
  const { toast } = useToast();
  const { isWalletConnected, connectWallet } = useWeb3();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleUpdate = async () => {
    if (!isWalletConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet connection required",
          description: "Please connect your wallet to update election status.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsUpdating(true);
    try {
      await autoUpdateElectionStatus(electionId);
      
      toast({
        title: "Election Status Updated",
        description: "The election status has been updated based on current time.",
        variant: "default",
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update election status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleUpdate}
      disabled={isUpdating}
    >
      {isUpdating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Auto-Update Status
        </>
      )}
    </Button>
  );
}