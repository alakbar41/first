import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { ServerIcon, Loader2 } from "lucide-react";
import { Election } from "@shared/schema";
import { ElectionType } from '@/lib/improved-web3-service';
import web3Service from '@/lib/improved-web3-service';

// Convert database election to blockchain election type
function mapElectionTypeToBlockchain(dbPosition: string): ElectionType {
  if (dbPosition.toLowerCase().includes('president')) {
    return ElectionType.PresidentVP;
  }
  return ElectionType.Senator;
}

// Convert DB date to Unix timestamp (seconds)
function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

interface DeployToBlockchainButtonProps {
  election: Election;
  onSuccess?: (blockchainId: number) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function DeployToBlockchainButton({ 
  election,
  onSuccess,
  variant = "default", 
  size = "default",
  className = ""
}: DeployToBlockchainButtonProps) {
  const { isInitialized, isWalletConnected, connectWallet } = useWeb3();
  const { toast } = useToast();
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  
  const handleDeploy = async () => {
    if (isDeployed || isDeploying) return;
    
    // Connect wallet first if not connected
    if (!isWalletConnected) {
      try {
        await connectWallet();
        // Now we're connected, continue with deployment
      } catch (error: any) {
        toast({
          title: "Wallet Connection Required",
          description: "Please connect your wallet to deploy to blockchain.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsDeploying(true);
    try {
      // Convert database election to blockchain parameters
      const electionType = mapElectionTypeToBlockchain(election.position);
      const startTimestamp = dateToTimestamp(new Date(election.startDate));
      const endTimestamp = dateToTimestamp(new Date(election.endDate));
      
      // Create election on blockchain
      console.log(`Deploying ${election.name} to blockchain...`);
      console.log(`Election type: ${electionType}, Start: ${startTimestamp}, End: ${endTimestamp}`);
      
      // Call the web3 service to create the election
      const blockchainElectionId = await web3Service.createElection(
        electionType,
        startTimestamp,
        endTimestamp
      );
      
      toast({
        title: "Election Deployed Successfully",
        description: `Election "${election.name}" has been deployed to blockchain with ID ${blockchainElectionId}`,
        variant: "default",
      });
      
      setIsDeployed(true);
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess(blockchainElectionId);
      }
      
    } catch (error: any) {
      console.error("Failed to deploy election to blockchain:", error);
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to deploy election to blockchain. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  // Disabled states
  if (!isInitialized) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`${className} bg-gray-50 text-gray-500`}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Initializing Blockchain...
      </Button>
    );
  }

  if (isDeployed) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`${className} bg-green-50 text-green-700 border-green-200`}
      >
        <ServerIcon className="mr-2 h-4 w-4" />
        Deployed to Blockchain
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDeploy}
      disabled={isDeploying || !isInitialized}
      className={`${className} ${isDeploying ? 'bg-purple-100 text-purple-800' : ''}`}
    >
      {isDeploying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying to Blockchain...
        </>
      ) : (
        <>
          <ServerIcon className="mr-2 h-4 w-4" />
          Deploy to Blockchain
        </>
      )}
    </Button>
  );
}