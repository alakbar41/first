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
  
  // Separate the wallet connection from deployment
  const connectMetamaskWallet = async (): Promise<boolean> => {
    if (isWalletConnected) return true;
    
    try {
      toast({
        title: "Connecting Wallet",
        description: "Please approve the MetaMask connection request.",
        variant: "default",
      });
      
      await connectWallet();
      return true;
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      // Handle the "already processing" error specially
      if (error.code === -32002) {
        toast({
          title: "MetaMask Connection In Progress",
          description: "Please check your MetaMask extension and complete the pending connection request.",
          variant: "default",
        });
      } else {
        toast({
          title: "Wallet Connection Failed",
          description: error.message || "Failed to connect wallet. Make sure MetaMask is installed and unlocked.",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const deployToBlockchain = async () => {
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
  
  const handleDeploy = async () => {
    if (isDeployed || isDeploying) return;
    
    // First connect wallet if needed
    const connected = await connectMetamaskWallet();
    if (!connected) return;
    
    // Now deploy to blockchain
    await deployToBlockchain();
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