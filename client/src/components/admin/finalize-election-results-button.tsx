import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { Loader2, CheckSquare } from "lucide-react";
import { finalizeResults } from '@/lib/improved-blockchain-integration';

interface FinalizeElectionResultsButtonProps {
  electionId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  onSuccess?: () => void;
}

export function FinalizeElectionResultsButton({ 
  electionId,
  variant = "default",
  size = "default",
  className = "",
  onSuccess
}: FinalizeElectionResultsButtonProps) {
  const { toast } = useToast();
  const { isWalletConnected, connectWallet } = useWeb3();
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const handleFinalize = async () => {
    if (!isWalletConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet connection required",
          description: "Please connect your wallet to finalize election results.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsFinalizing(true);
    try {
      await finalizeResults(electionId);
      
      toast({
        title: "Results Finalized",
        description: "The election results have been finalized on the blockchain.",
        variant: "default",
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Finalization Failed",
        description: error.message || "Failed to finalize election results. Make sure the election is completed first.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleFinalize}
      disabled={isFinalizing}
    >
      {isFinalizing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Finalizing Results...
        </>
      ) : (
        <>
          <CheckSquare className="mr-2 h-4 w-4" />
          Finalize Results
        </>
      )}
    </Button>
  );
}