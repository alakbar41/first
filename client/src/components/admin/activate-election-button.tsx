import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { Loader2, PlayCircle } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { ElectionStatus } from '@/lib/improved-web3-service';
import { ethers } from 'ethers';

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
    if (!blockchainId) return null;
    
    // Note: We don't check isInitialized anymore because we're using lazy initialization
    
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
    
    // We don't need to check isInitialized anymore since we're using lazy initialization
    
    // Connect wallet if not connected - this is still necessary since the user needs
    // to be logged into MetaMask before we attempt the transaction
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
    
    // Check if we need to update election time settings before activation
    // This ensures the start time is compatible with the contract validation
    try {
      const details = await web3Service.getElectionDetails(blockchainId);
      const now = Math.floor(Date.now() / 1000);
      
      if (details.startTime > now) {
        toast({
          title: "Notice: Election Start Time Adjustment",
          description: "The blockchain activation requires start time to be current. After activating, the election will be immediately available for voting.",
          variant: "default",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error checking election time settings:", error);
      // Continue with activation attempt even if the check fails
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
      let retryCount = 0;
      const maxRetries = 2;
      
      const attemptActivation = async (): Promise<boolean> => {
        try {
          // Call the smart contract to start the election with higher gas settings on retry
          if (retryCount > 0) {
            await web3Service.startElectionWithCustomGas(blockchainId, {
              gasLimit: 1500000, // Even higher gas limit on retry
              maxPriorityFeePerGas: ethers.parseUnits((20 + (retryCount * 5)).toString(), "gwei"),
              maxFeePerGas: ethers.parseUnits((50 + (retryCount * 10)).toString(), "gwei"),
            });
          } else {
            await web3Service.startElection(blockchainId);
          }
          return true;
        } catch (error: any) {
          console.error(`Activation attempt ${retryCount + 1} failed:`, error);
          
          // Specific error checks
          if (error.message && error.message.includes("user rejected")) {
            toast({
              title: "Transaction Rejected",
              description: "You rejected the activation transaction. The election remains in pending state.",
              variant: "destructive",
            });
            return false; // Don't retry on user rejection
          }
          
          // MetaMask not installed or not connected
          if (error.message && (
              error.message.includes("MetaMask is not installed") || 
              error.message.includes("Failed to connect to blockchain") ||
              error.message.includes("Contract could not be initialized"))) {
            
            toast({
              title: "Wallet Connection Issue",
              description: "Please make sure MetaMask is installed and connected to continue.",
              variant: "destructive",
            });
            return false; // Don't retry on wallet connection issues
          }
          
          // MetaMask RPC error - often temporary
          if (error.message && (
              error.message.includes("Internal JSON-RPC error") || 
              error.message.includes("could not coalesce error") ||
              error.message.includes("transaction underpriced") ||
              error.message.includes("insufficient funds"))) {
            
            if (retryCount < maxRetries) {
              retryCount++;
              const waitTime = retryCount * 1500; // Increase wait time with each retry
              
              toast({
                title: "Transaction Failed",
                description: `Network congestion detected. Retrying in ${waitTime/1000} seconds with higher gas settings...`,
                variant: "default",
              });
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, waitTime));
              return await attemptActivation(); // Recursive retry
            } else {
              toast({
                title: "Network Congestion",
                description: "The Ethereum Sepolia testnet is experiencing high congestion. Please try again later or ensure you have enough testnet ETH.",
                variant: "destructive",
              });
              return false;
            }
          }
          
          // Other errors
          toast({
            title: "Activation Failed",
            description: error.message || "Failed to activate election on the blockchain.",
            variant: "destructive",
          });
          return false;
        }
      };
      
      try {
        const success = await attemptActivation();
        
        if (success) {
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