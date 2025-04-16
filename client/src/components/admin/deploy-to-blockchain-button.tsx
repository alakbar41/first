import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { ServerIcon, Loader2, AlertTriangle, Info, Users } from "lucide-react";
import { Election } from "@shared/schema";
import { ElectionType } from '@/lib/improved-web3-service';
import web3Service from '@/lib/improved-web3-service';
import studentIdWeb3Service from '@/lib/student-id-web3-service';
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { BlockchainWrapper } from '../blockchain/BlockchainWrapper';

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
function dateToTimestamp(date: Date | string, isEndTime: boolean = false): number {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds

  // Handle null, undefined or invalid date inputs
  if (!date) {
    console.warn("Invalid date input to dateToTimestamp, using current time + offset");
    return isEndTime ? now + 3600 : now + 60; // End time gets +1 hour, start time gets +1 minute
  }

  // Convert string to Date if needed
  let dateObj: Date;
  if (typeof date === 'string') {
    // Ensure string is in ISO format with timezone
    if (!date.includes('Z') && !date.includes('+')) {
      date = date + 'Z'; // Add UTC indicator to avoid browser locale issues
    }
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Ensure it's a valid date
  if (isNaN(dateObj.getTime())) {
    console.warn("Invalid date object in dateToTimestamp, using current time + offset");
    return isEndTime ? now + 3600 : now + 60; // End time gets +1 hour, start time gets +1 minute
  }

  const dateTimestamp = Math.floor(dateObj.getTime() / 1000);

  // Log for debugging
  console.log(`Converting ${isEndTime ? 'end' : 'start'} date ${dateObj.toISOString()} to timestamp ${dateTimestamp} seconds`);

  // If the date is in the past, return future time
  if (dateTimestamp <= now) {
    const adjustedTime = isEndTime ? now + 3600 : now + 60; // End time gets +1 hour, start time gets +1 minute
    console.log(`${isEndTime ? 'End' : 'Start'} date is in the past, using alternate time: ${adjustedTime}`);
    return adjustedTime;
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

  // Function to get CSRF token
  const getCsrfToken = async (): Promise<string> => {
    try {
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      return csrfData.csrfToken;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw new Error('Failed to get CSRF token');
    }
  };

  // Register candidate with student ID on blockchain and update database when successful
  const registerCandidateWithStudentId = async (candidate: any): Promise<number | null> => {
    try {
      console.log(`Registering candidate ${candidate.fullName} with student ID ${candidate.studentId}`);

      // Make sure we have a valid student ID
      if (!candidate.studentId || candidate.studentId.trim() === '') {
        throw new Error(`Candidate ${candidate.fullName} has no valid student ID`);
      }

      let blockchainId: number | null = null;
      let retryCount = 0;
      const maxRetries = 2;

      // First check if this candidate is already registered on blockchain
      while (blockchainId === null && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount} for candidate ${candidate.fullName}`);
          }

          try {
            // Try to get existing ID first
            blockchainId = await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
            console.log(`Candidate with student ID ${candidate.studentId} already registered with ID ${blockchainId}`);
            break;
          } catch (lookupError) {
            // If not found, proceed with registration
            console.log(`Candidate with student ID ${candidate.studentId} not found, registering now`);

            // Initialize web3 service to ensure connection is fresh
            await studentIdWeb3Service.initialize();

            // Register candidate on blockchain
            blockchainId = await studentIdWeb3Service.registerCandidate(candidate.studentId);
            console.log(`Successfully registered candidate with student ID ${candidate.studentId} as blockchain ID ${blockchainId}`);
            break;
          }
        } catch (retryError) {
          retryCount++;
          if (retryCount > maxRetries) {
            console.error(`Failed after ${maxRetries} attempts to register candidate ${candidate.fullName}`);
            throw retryError;
          }
          console.log(`Attempt ${retryCount} failed, retrying...`);
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (blockchainId === null) {
        throw new Error(`Failed to register or find candidate ${candidate.fullName} with student ID ${candidate.studentId}`);
      }

      // Update candidate in database with blockchain ID
      try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/candidates/${candidate.id}/blockchain-id`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ blockchainId }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Failed to update candidate ${candidate.id} with blockchain ID ${blockchainId} in database: ${errorText}`);
        } else {
          console.log(`Updated candidate ${candidate.id} with blockchain ID ${blockchainId} in database`);
        }
      } catch (dbError) {
        // Don't let DB errors stop the process, just log them
        console.warn(`Database update failed for candidate ${candidate.id}, but blockchain registration was successful:`, dbError);
      }

      return blockchainId;
    } catch (error: any) {
      console.error(`Failed to register candidate ${candidate.fullName} with student ID ${candidate.studentId}:`, error);
      throw error;
    }
  };

  // Register a candidate for an election on blockchain
  const registerCandidateForElection = async (candidateId: number, electionId: number, blockchainElectionId: number): Promise<void> => {
    try {
      // Find candidate in our list
      const candidate = electionCandidates.find((ec: any) => ec.candidateId === candidateId);
      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found in election ${electionId}`);
      }

      // Fetch full candidate details
      const candidateResponse = await fetch(`/api/candidates/${candidateId}`);
      if (!candidateResponse.ok) throw new Error(`Failed to fetch candidate ${candidateId} details`);
      const candidateDetails = await candidateResponse.json();

      console.log(`Registering candidate ${candidateDetails.fullName} for election ${electionId}`);

      // Get or register candidate on blockchain
      let blockchainCandidateId: number | null = null;
      let retryCount = 0;
      const maxRetries = 2;

      while (blockchainCandidateId === null && retryCount <= maxRetries) {
        try {
          if (retryCount > 0) {
            console.log(`Retry attempt ${retryCount} for registering candidate ${candidateDetails.fullName}`);
          }

          blockchainCandidateId = await registerCandidateWithStudentId(candidateDetails);

          if (!blockchainCandidateId) {
            throw new Error(`Could not get blockchain ID for candidate ${candidateId}`);
          }

          console.log(`Got blockchain ID ${blockchainCandidateId} for candidate ${candidateDetails.fullName}`);

          // Initialize web3 service to ensure connection is fresh
          await studentIdWeb3Service.initialize();

          // Register candidate for election on blockchain
          console.log(`Adding candidate ${blockchainCandidateId} to election ${blockchainElectionId} on blockchain`);
          await studentIdWeb3Service.registerCandidateForElection(
            blockchainElectionId, 
            blockchainCandidateId
          );

          console.log(`Successfully registered candidate ${candidateDetails.fullName} for election ${electionId} on blockchain`);
          break; // Exit the loop if successful
        } catch (retryError: any) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, retryError);

          if (retryCount > maxRetries) {
            console.error(`Failed after ${maxRetries} attempts to register candidate ${candidateDetails.fullName} for election`);
            throw retryError;
          }

          console.log(`Waiting before retry ${retryCount}...`);
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Final verification - check if candidate is correctly registered for the election
      try {
        const electionCandidates = await studentIdWeb3Service.getElectionCandidates(blockchainElectionId);
        const isRegistered = electionCandidates.includes(blockchainCandidateId);

        if (!isRegistered) {
          console.warn(`Verification failed: Candidate ${candidateDetails.fullName} (ID: ${blockchainCandidateId}) is not listed in election ${blockchainElectionId} candidates`);
          // If we're on the last retry and still not registered, try one more time specifically for the election link
          if (retryCount >= maxRetries) {
            console.log(`Final attempt to link candidate ${blockchainCandidateId} to election ${blockchainElectionId}`);
            await studentIdWeb3Service.registerCandidateForElection(blockchainElectionId, blockchainCandidateId);
          }
        } else {
          console.log(`Verified: Candidate ${candidateDetails.fullName} (ID: ${blockchainCandidateId}) is correctly registered for election ${blockchainElectionId}`);
        }
      } catch (verifyError) {
        console.warn(`Could not verify candidate registration for election:`, verifyError);
        // Don't fail the process for verification errors
      }

    } catch (error: any) {
      console.error(`Failed to register candidate ${candidateId} for election ${electionId}:`, error);
      throw error;
    }
  };

  const deployToBlockchain = async () => {
    setIsDeploying(true);
    try {
      // Make sure we have a wallet connection
      if (!isWalletConnected) {
        await connectWallet();
      }

      // Toast to indicate the process has started
      toast({
        title: "Deploying to Blockchain",
        description: "Starting the unified deployment process. This will deploy the election and register all candidates in a single transaction.",
        duration: 5000,
      });

      // Ensure both services are initialized
      await Promise.all([
        web3Service.initialize(),
        studentIdWeb3Service.initialize()
      ]);

      // Convert database election to blockchain parameters
      const electionType = mapElectionTypeToBlockchain(election.position);
      // Use startTime or startDate field, with proper fallback
      const startTimestamp = dateToTimestamp(election.startDate || election.startTime, false);
      let endTimestamp = dateToTimestamp(election.endDate || election.endTime, true);

      // Validate that end time is after start time
      if (endTimestamp <= startTimestamp) {
        console.warn("End time must be after start time, adjusting end time");
        // Set end time to start time + 30 minutes
        endTimestamp = startTimestamp + 1800;
        console.log(`Adjusted end time to ${endTimestamp} (30 minutes after start time)`);
      }

      // Create election on blockchain
      console.log(`Deploying ${election.name} to blockchain...`);
      console.log(`Election type: ${electionType}, Start: ${startTimestamp}, End: ${endTimestamp}`);

      // Show more detailed toast for user with manual gas configuration instructions for the bundled tx
      toast({
        title: "Creating Election with Candidates",
        description: "Please approve the transaction in MetaMask. This is a unified transaction that deploys everything at once. We've optimized the gas settings to be more affordable while ensuring successful deployment.",
        duration: 8000,
      });

      // Prepare the candidate data for the bundled election creation
      // We need to collect either candidateIds (for senator elections) or ticketPairs (for president/VP elections)
      const isPresidentElection = electionType === ElectionType.PresidentVP;
      const candidateIds: string[] = [];
      const ticketPairs: string[][] = [];

      if (electionCandidates && electionCandidates.length > 0) {
        // Log candidates for debugging
        console.log("Candidates for election:", electionCandidates);
        
        if (isPresidentElection) {
          // For President elections, we need to organize candidates into president/VP pairs
          // Each ticket needs a president and a running mate
          for (const candidate of electionCandidates) {
            if (candidate.runningMateStudentId) {
              // Add [president, vp] pair
              ticketPairs.push([candidate.candidateStudentId, candidate.runningMateStudentId]);
              console.log(`Added ticket: [${candidate.candidateStudentId}, ${candidate.runningMateStudentId}]`);
            } else {
              console.warn(`President candidate without running mate: ${candidate.candidateStudentId}`);
              // We'll still add them as individual candidates
              candidateIds.push(candidate.candidateStudentId);
            }
          }
        } else {
          // For Senator elections, simply collect all candidate IDs
          for (const candidate of electionCandidates) {
            candidateIds.push(candidate.candidateStudentId);
            console.log(`Added senator candidate: ${candidate.candidateStudentId}`);
          }
        }
      }

      // Log the data we've prepared
      console.log(`Prepared data for deployment:
        Election Type: ${electionType} (${isPresidentElection ? 'President/VP' : 'Senator'})
        Start Time: ${startTimestamp}
        End Time: ${endTimestamp}
        Senator Candidates: ${candidateIds.length}
        President/VP Tickets: ${ticketPairs.length}
      `);

      // Call the web3 service to create the election with candidates in a single transaction
      console.log("About to call createElectionWithCandidates on web3Service");

      const blockchainElectionId = await web3Service.createElectionWithCandidates(
        electionType,
        startTimestamp,
        endTimestamp,
        candidateIds,
        ticketPairs
      );
      console.log(`Successfully deployed election with candidates to blockchain with ID: ${blockchainElectionId}`);

      // Update the election in the database with the blockchain ID
      try {
        console.log(`Saving blockchain ID ${blockchainElectionId} for election ${election.id} to database`);
        const csrfToken = await getCsrfToken();

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
        description: `Election "${election.name}" has been deployed to blockchain with ID ${blockchainElectionId} and all candidates have been registered.`,
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
          description: "The Polygon Amoy testnet may be experiencing high congestion. Please try again in a few moments when network conditions improve.",
          variant: "destructive",
          duration: 10000
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
          Deploy with Candidates
        </>
      )}
    </Button>
  );
}

// Export the wrapped component with blockchain context
export function DeployToBlockchainButtonWithWeb3(props: DeployToBlockchainButtonProps) {
  return (
    <BlockchainWrapper>
      <DeployToBlockchainButton {...props} />
    </BlockchainWrapper>
  );
}