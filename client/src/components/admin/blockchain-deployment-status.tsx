import { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Info, Server, ServerOff, Check } from "lucide-react";
import { Election } from "@shared/schema";
import { useWeb3 } from "@/hooks/use-web3";
import web3Service from '@/lib/improved-web3-service';
import { ElectionStatus } from '@/lib/improved-web3-service';

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

  // Check blockchain status
  useEffect(() => {
    const checkBlockchainStatus = async () => {
      if (!isInitialized || !election.blockchainId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const details = await web3Service.getElectionDetails(election.blockchainId);
        setBlockchainDetails(details);
        
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
    
    checkBlockchainStatus();
  }, [isInitialized, election.blockchainId]);

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
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-yellow-50 text-yellow-700 border-yellow-200 ${className}`}
            >
              <Server className="mr-1 h-3 w-3" />
              On-Chain (Pending)
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="right">
              <p>This election is deployed to the blockchain but not yet active.</p>
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
    );
  }

  if (blockchainStatus === 'active') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-green-50 text-green-700 border-green-200 ${className}`}
            >
              <Server className="mr-1 h-3 w-3" />
              On-Chain (Active)
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="right">
              <p>This election is active on the blockchain. Votes are being recorded.</p>
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
    );
  }

  if (blockchainStatus === 'completed') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}
            >
              <Check className="mr-1 h-3 w-3" />
              On-Chain (Completed)
            </Badge>
          </TooltipTrigger>
          {showTooltip && (
            <TooltipContent side="right">
              <p>This election has ended. All votes are recorded on the blockchain.</p>
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