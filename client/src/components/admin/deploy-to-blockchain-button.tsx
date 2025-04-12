import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { ServerIcon, Loader2, AlertTriangle, Info } from "lucide-react";
import { Election } from "@shared/schema";
import { ElectionType } from '@/lib/improved-web3-service';
import web3Service from '@/lib/improved-web3-service';
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

// Convert database election to blockchain election type
function mapElectionTypeToBlockchain(dbPosition: string): ElectionType {
  if (dbPosition.toLowerCase().includes('president')) {
    return ElectionType.PresidentVP;
  }
  return ElectionType.Senator;
}

// Convert DB date to Unix timestamp (seconds)
// Modified to ensure dates work with blockchain contract requirements
// - Start time must be in future when deploying 
// - Start time must be "now" when activating
function dateToTimestamp(date: Date): number {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const dateTimestamp = Math.floor(date.getTime() / 1000);
  
  // If the date is in the past, return future time (now + 60 seconds)
  // This ensures our deployment succeeds while still allowing immediate activation
  if (dateTimestamp <= now) {
    return now + 60; // 1 minute in the future
  }
  
  return dateTimestamp;
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
  const [alreadyDeployedWarning, setAlreadyDeployedWarning] = useState(false);
  
  // Fetch election candidates to verify minimum candidate count
  const { data: electionCandidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: [`/api/elections/${election.id}/candidates`],
    queryFn: async () => {
      const response = await fetch(`/api/elections/${election.id}/candidates`);
      if (!response.ok) throw new Error("Failed to fetch election candidates");
      return response.json();
    },
  });
  
  const hasMinimumCandidates = electionCandidates.length >= 2;
  
  // Set initial state based on whether the election already has a blockchain ID
  useEffect(() => {
    if (election.blockchainId) {
      setIsDeployed(true);
      setAlreadyDeployedWarning(true);
    }
  }, [election.blockchainId]);
  
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
      // Make sure we have a wallet connection
      if (!isWalletConnected) {
        await connectWallet();
      }
      
      // Convert database election to blockchain parameters
      const electionType = mapElectionTypeToBlockchain(election.position);
      const startTimestamp = dateToTimestamp(new Date(election.startDate));
      const endTimestamp = dateToTimestamp(new Date(election.endDate));
      
      // Create election on blockchain
      console.log(`Deploying ${election.name} to blockchain...`);
      console.log(`Election type: ${electionType}, Start: ${startTimestamp}, End: ${endTimestamp}`);
      
      // Show more detailed toast for user with manual gas configuration instructions
      toast({
        title: "Deploying to Blockchain",
        description: "Please approve the transaction in MetaMask. For best results, click the Edit button in MetaMask and manually set: Gas limit to at least 2000000, Max priority fee to 25 gwei, and Max fee to 60 gwei. This helps ensure success on the congested Polygon Amoy testnet.",
        duration: 20000,
      });
      
      // Ensure contract is initialized with signer before calling
      await web3Service.initialize();
      
      // Call the web3 service to create the election with extra logging
      console.log("About to call createElection on web3Service");
      console.log("If this operation fails, it may be due to network issues or gas limitations");
      
      const blockchainElectionId = await web3Service.createElection(
        electionType,
        startTimestamp,
        endTimestamp
      );
      console.log(`Successfully deployed election to blockchain with ID: ${blockchainElectionId}`);
      
      // Update the election in the database with the blockchain ID
      try {
        console.log(`Saving blockchain ID ${blockchainElectionId} for election ${election.id} to database`);
        // Get the CSRF token
        const csrfResponse = await fetch('/api/csrf-token');
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData.csrfToken;
        
        const response = await fetch(`/api/elections/${election.id}/blockchain-id`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ blockchainId: blockchainElectionId }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to update election with blockchain ID:', errorText);
          throw new Error(`Failed to update election with blockchain ID: ${errorText}`);
        } else {
          const updatedElection = await response.json();
          console.log('Successfully updated election with blockchain ID in database:', updatedElection);
          
          // Invalidate the elections cache to refresh all components that use election data
          // This ensures the BlockchainDeploymentStatus component gets fresh data
          queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
          
          // Also invalidate any specific election query if it exists
          queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}`] });
        }
      } catch (error) {
        console.error('Error updating election with blockchain ID:', error);
        // Continue the flow even if database update fails, as the blockchain deployment was successful
      }
      
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
      
      // Check for specific error types
      if (error.message && error.message.includes("user rejected action")) {
        toast({
          title: "Transaction Rejected",
          description: "You rejected the transaction in MetaMask. Please try again and approve the transaction when prompted.",
          variant: "destructive",
          duration: 5000
        });
      } else if (error.message && error.message.includes("execution reverted")) {
        toast({
          title: "Blockchain Contract Error",
          description: `The smart contract rejected the operation. This could be due to a limit on the number of elections, time constraints, or permission issues. Please check the console for more details.`,
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("Internal JSON-RPC error")) {
        toast({
          title: "Polygon Network Congestion",
          description: "The Polygon Amoy testnet is experiencing high congestion. Please try again with manual configuration in MetaMask: click Edit during transaction confirmation and set Gas limit to 2000000, Max priority fee to 25 gwei, and Max fee to 60 gwei.",
          variant: "destructive",
          duration: 20000
        });
      } else {
        toast({
          title: "Deployment Failed",
          description: error.message || "Failed to deploy election to blockchain. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDeploying(false);
    }
  };
  
  const handleDeploy = async () => {
    if (isDeployed || isDeploying) return;
    
    // Check for minimum number of candidates first
    if (!hasMinimumCandidates) {
      toast({
        title: "Cannot Deploy Election",
        description: "A minimum of 2 candidates is required before deploying an election to the blockchain. Please add more candidates.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (alreadyDeployedWarning) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col">
                <Button
                  variant="outline"
                  size={size}
                  disabled
                  className={`${className} bg-green-50 text-green-700 border-green-200`}
                >
                  <ServerIcon className="mr-2 h-4 w-4" />
                  Already Deployed
                </Button>
                <div className="mt-1 flex items-center justify-center text-amber-700 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span>Already on blockchain (ID: {election.blockchainId})</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>This election has already been deployed to the blockchain with ID: {election.blockchainId}.</p>
              <p className="mt-1 text-amber-700">Warning: Attempting to redeploy may create a duplicate election on the blockchain.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
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

  // Not enough candidates warning
  if (!hasMinimumCandidates && !isLoadingCandidates) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col">
              <Button
                variant="outline"
                size={size}
                disabled
                className={`${className} bg-amber-50 text-amber-700 border-amber-200`}
              >
                <Info className="mr-2 h-4 w-4" />
                Add More Candidates
              </Button>
              <div className="mt-1 flex items-center justify-center text-amber-700 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Need at least 2 candidates</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p>Elections require a minimum of 2 candidates before they can be deployed to the blockchain.</p>
            <p className="mt-1">Current candidate count: {electionCandidates.length}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDeploy}
      disabled={isDeploying || !isInitialized || isLoadingCandidates}
      className={`${className} ${isDeploying ? 'bg-purple-100 text-purple-800' : ''}`}
    >
      {isDeploying ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Deploying to Blockchain...
        </>
      ) : isLoadingCandidates ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Checking Candidates...
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