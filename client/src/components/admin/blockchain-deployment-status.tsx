import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Info, Server, ServerOff, Check } from "lucide-react";
import { Election } from "@shared/schema";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { ElectionStatus } from '@/lib/improved-web3-service';
import { UpdateBlockchainStatusButton } from './update-blockchain-status-button';

// Used to force a refresh when blockchainId changes
const getKey = (election: Election) => `blockchain-status-${election.id}-${election.blockchainId || 'none'}`;

interface BlockchainDeploymentStatusProps {
  election: Election;
  showTooltip?: boolean;
  showDetailed?: boolean;
  className?: string;
}

export function BlockchainDeploymentStatus({ 
  election,
  showTooltip = true,
  showDetailed = false,
  className = ""
}: BlockchainDeploymentStatusProps) {
  const { isInitialized } = useWeb3();
  const [blockchainStatus, setBlockchainStatus] = useState<string | null>(null);
  const [blockchainDetails, setBlockchainDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check blockchain status and optionally auto-update if needed
  useEffect(() => {
    const checkBlockchainStatus = async () => {
      if (!isInitialized || !election.blockchainId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const details = await web3Service.getElectionDetails(election.blockchainId);
        setBlockchainDetails(details);
        
        // Check if election status should be updated based on time
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const shouldBeActive = currentTime >= details.startTime && currentTime <= details.endTime;
        const shouldBeCompleted = currentTime > details.endTime;
        
        // Improved logging about status checks
        if (details.status === ElectionStatus.Pending && shouldBeActive) {
          console.log(`Election ${election.blockchainId} is in Pending status but should be Active based on time (${new Date(details.startTime * 1000).toLocaleString()} - ${new Date(details.endTime * 1000).toLocaleString()}). Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
        } else if (details.status === ElectionStatus.Active && shouldBeCompleted) {
          console.log(`Election ${election.blockchainId} is in Active status but should be Completed based on time (end: ${new Date(details.endTime * 1000).toLocaleString()}). Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
        } else {
          console.log(`Election ${election.blockchainId} has correct status (${details.status}) based on time period (${new Date(details.startTime * 1000).toLocaleString()} - ${new Date(details.endTime * 1000).toLocaleString()}). Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
        }
        
        // Map blockchain status to readable format
        if (details) {
          switch (details.status) {
            case ElectionStatus.Pending:
              setBlockchainStatus('pending');
              break;
            case ElectionStatus.Active:
              setBlockchainStatus('active');
              break;
            case ElectionStatus.Completed:
              setBlockchainStatus('completed');
              break;
            case ElectionStatus.Cancelled:
              setBlockchainStatus('cancelled');
              break;
            default:
              setBlockchainStatus('unknown');
          }
        }
      } catch (error: any) {
        console.error('Error fetching blockchain status:', error);
        setError(error.message || 'Failed to fetch blockchain status');
        setBlockchainStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Reset state when election or blockchainId changes
    setBlockchainStatus(null);
    setBlockchainDetails(null);
    setError(null);
    setIsLoading(!!election.blockchainId);
    
    if (election.blockchainId) {
      checkBlockchainStatus();
    }
    
    // Use the key to force component to properly reset when the blockchainId changes
  }, [isInitialized, election.id, election.blockchainId, getKey(election)]);

  // If not deployed to blockchain
  if (!election.blockchainId) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-gray-100 text-gray-700 border-gray-300 ${className}`}
            >
              <ServerOff className="mr-1 h-3 w-3" />
              Off-Chain
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="right">
              <p>This election has not been deployed to the blockchain yet.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If deployed but loading status
  if (isLoading) {
    return (
      <Badge 
        variant="outline" 
        className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}
      >
        <Server className="mr-1 h-3 w-3" />
        Checking...
      </Badge>
    );
  }

  // If error loading status
  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-red-50 text-red-700 border-red-200 ${className}`}
            >
              <AlertCircle className="mr-1 h-3 w-3" />
              On-Chain (Error)
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="right">
              <p>Error checking blockchain status: {error}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Status-specific badges with tooltips
  if (blockchainStatus === 'pending') {
    // Check if election should be active based on current time
    const currentTime = Math.floor(Date.now() / 1000);
    const shouldShowUpdateButton = blockchainDetails && 
      currentTime >= blockchainDetails.startTime && 
      currentTime <= blockchainDetails.endTime;
      
    return (
      <div className="flex flex-row items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-purple-50 text-purple-700 border-purple-200 ${className}`}
              >
                <Server className="mr-1 h-3 w-3" />
                On-Chain
              </Badge>
            </TooltipTrigger>
            {showTooltip && (
              <TooltipContent side="right">
                <p>This election is deployed to the blockchain.</p>
                {shouldShowUpdateButton && (
                  <p className="text-amber-600 font-medium mt-1">This election should be active now. Use the Sync Timeline button if voting isn't working.</p>
                )}
                {showDetailed && blockchainDetails && (
                  <div className="mt-2 text-xs">
                    <p>Blockchain ID: {election.blockchainId}</p>
                    <p>Start: {new Date(blockchainDetails.startTime * 1000).toLocaleString()}</p>
                    <p>End: {new Date(blockchainDetails.endTime * 1000).toLocaleString()}</p>
                  </div>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <Badge 
          variant="outline" 
          className="bg-yellow-50 text-yellow-700 border-yellow-200 ml-1 text-xs"
        >
          <Info className="mr-1 h-3 w-3" />
          Not Started
        </Badge>
        
        {shouldShowUpdateButton && showDetailed && (
          <UpdateBlockchainStatusButton 
            electionId={election.id} 
            blockchainId={Number(election.blockchainId)} 
            variant="outline"
            size="sm"
            className="ml-1 text-xs h-7 px-2 py-0"
          />
        )}
      </div>
    );
  }

  if (blockchainStatus === 'active') {
    // Check if election should be completed based on time
    const currentTime = Math.floor(Date.now() / 1000);
    const shouldBeCompleted = blockchainDetails && currentTime > blockchainDetails.endTime;
    
    return (
      <div className="flex flex-row items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-purple-50 text-purple-700 border-purple-200 ${className}`}
              >
                <Server className="mr-1 h-3 w-3" />
                On-Chain
              </Badge>
            </TooltipTrigger>
            {showTooltip && (
              <TooltipContent side="right">
                <p>This election is deployed to the blockchain.</p>
                {shouldBeCompleted && (
                  <p className="text-amber-600 font-medium mt-1">This election should be completed now. Use the Sync Timeline button to update it.</p>
                )}
                {showDetailed && blockchainDetails && (
                  <div className="mt-2 text-xs">
                    <p>Blockchain ID: {election.blockchainId}</p>
                    <p>Votes cast: {blockchainDetails.totalVotesCast}</p>
                    <p>End: {new Date(blockchainDetails.endTime * 1000).toLocaleString()}</p>
                  </div>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <Badge 
          variant="outline" 
          className="bg-green-50 text-green-700 border-green-200 ml-1 text-xs"
        >
          <Check className="mr-1 h-3 w-3" />
          Voting Active
        </Badge>
        
        {shouldBeCompleted && showDetailed && (
          <UpdateBlockchainStatusButton 
            electionId={election.id} 
            blockchainId={Number(election.blockchainId)} 
            variant="outline"
            size="sm"
            className="ml-1 text-xs h-7 px-2 py-0"
          />
        )}
      </div>
    );
  }

  if (blockchainStatus === 'completed') {
    return (
      <div className="flex flex-row items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`bg-purple-50 text-purple-700 border-purple-200 ${className}`}
              >
                <Server className="mr-1 h-3 w-3" />
                On-Chain
              </Badge>
            </TooltipTrigger>
            {showTooltip && (
              <TooltipContent side="right">
                <p>This election is deployed to the blockchain.</p>
                {showDetailed && blockchainDetails && (
                  <div className="mt-2 text-xs">
                    <p>Blockchain ID: {election.blockchainId}</p>
                    <p>Total votes: {blockchainDetails.totalVotesCast}</p>
                    <p>Results finalized: {blockchainDetails.resultsFinalized ? 'Yes' : 'No'}</p>
                  </div>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        
        <Badge 
          variant="outline" 
          className="bg-blue-50 text-blue-700 border-blue-200 ml-1 text-xs"
        >
          <Check className="mr-1 h-3 w-3" />
          Voting Ended
        </Badge>
      </div>
    );
  }

  // Default badge with ID information
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`bg-purple-50 text-purple-700 border-purple-200 ${className}`}
          >
            <Server className="mr-1 h-3 w-3" />
            On-Chain
          </Badge>
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent side="right">
            <p>This election is deployed to the blockchain.</p>
            <p className="text-xs mt-1">Blockchain ID: {election.blockchainId}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}