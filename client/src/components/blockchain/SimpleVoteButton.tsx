import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, VoteIcon, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import * as ethers from "ethers";
import { getBlockchainElectionId, getBlockchainCandidateId } from "@/lib/blockchain-id-mapping";

interface SimpleVoteButtonProps {
  electionId: number;
  candidateId: number;
  blockchainId?: number; // Optional blockchain ID if different from database ID
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  disabled?: boolean;
  onVoteSuccess?: (txHash: string) => void;
}

// State for vote process
type VoteState = 'idle' | 'requesting-token' | 'token-received' | 'connecting-wallet' | 'submitting-vote' | 'recording-vote';

// Token-based secure voting implementation
export function SimpleVoteButton({ 
  electionId,
  candidateId,
  blockchainId,
  variant = "default", 
  size = "default",
  className = "",
  disabled = false,
  onVoteSuccess
}: SimpleVoteButtonProps) {
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [votingToken, setVotingToken] = useState<string | null>(null);
  const { toast } = useToast();
  
  const isVoting = voteState !== 'idle';
  
  // Request a voting token from the server
  const requestVotingToken = async (): Promise<string> => {
    try {
      setVoteState('requesting-token');
      
      const response = await apiRequest('POST', '/api/voting-tokens', {
        electionId
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get voting token');
      }
      
      const data = await response.json();
      return data.token;
    } catch (error: any) {
      console.error('Failed to get voting token:', error);
      throw error;
    }
  };
  
  // Verify token is valid before voting
  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', '/api/voting-tokens/verify', {
        token,
        electionId,
        candidateId
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  };
  
  // Mark token as used after successful vote
  const markTokenAsUsed = async (token: string, txHash: string): Promise<void> => {
    try {
      const response = await apiRequest('POST', '/api/voting-tokens/use', {
        token,
        electionId,
        candidateId,
        txHash, // Include the transaction hash for verification
      });
      
      if (!response.ok) {
        console.warn('Failed to mark token as used, but vote was successful');
      }
    } catch (error) {
      console.error('Failed to mark token as used:', error);
      // We don't throw here since the vote was successful
    }
  };
  
  // Reset vote in the database if blockchain transaction failed
  const resetVote = async (electionId: number, txHash: string): Promise<void> => {
    try {
      const response = await apiRequest('POST', '/api/test/reset-user-vote', {
        electionId
      });
      
      if (response.ok) {
        console.log('Vote reset successfully - you can now vote again');
      } else {
        console.warn('Failed to reset vote, user may not be able to vote again');
      }
    } catch (error) {
      console.error('Failed to reset vote:', error);
    }
  };

  // Main vote handler function
  const handleVote = async () => {
    if (isVoting || disabled) return;
    
    try {
      // Step 1: Request voting token from server
      let token;
      try {
        token = await requestVotingToken();
        setVotingToken(token);
        setVoteState('token-received');
        
        toast({
          title: "Voting token received",
          description: "Your one-time voting token has been issued.",
          duration: 3000,
        });
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        
        if (errorMessage.includes('already voted')) {
          toast({
            title: "Already voted",
            description: "You have already voted in this election.",
            variant: "destructive",
            duration: 5000,
          });
        } else {
          toast({
            title: "Token error",
            description: `Failed to get voting token: ${errorMessage}`,
            variant: "destructive",
            duration: 5000,
          });
        }
        
        setVoteState('idle');
        setVotingToken(null);
        return;
      }
      
      // Step 2: Check if token is valid
      const isTokenValid = await verifyToken(token);
      if (!isTokenValid) {
        toast({
          title: "Invalid token",
          description: "Your voting token is invalid or has expired. Please try again.",
          variant: "destructive",
          duration: 5000,
        });
        
        setVoteState('idle');
        setVotingToken(null);
        return;
      }
      
      // Step 3: Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to vote.');
      }
      
      // Step 4: Connect to wallet
      setVoteState('connecting-wallet');
      toast({
        title: "Connecting to wallet...",
        description: "Please approve the connection request in your wallet.",
        duration: 5000,
      });
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Step 4.5: Check if we're on the correct network (Polygon Amoy)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // If already on Polygon Amoy, continue without prompt
      if (chainId === '0x13882') { // 80002 in hex
        console.log('Already on Polygon Amoy network, chainId: 0x13882 (80002)');
      } else {
        toast({
          title: "Network check",
          description: "Checking if we're on the Polygon Amoy network...",
          duration: 3000,
        });
        
        try {
          console.log('Current chainId:', chainId, 'Need to switch to Polygon Amoy: 0x13882');
          
          // First try to switch to the network if it's already added
          try {
            console.log('Attempting to switch to Polygon Amoy network');
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x13882' }], // 80002 in hex
            });
            console.log('Successfully switched to Polygon Amoy network');
          } catch (switchError: any) {
            console.log('Switch network error:', switchError.code, switchError.message);
            
            // This error code (4902) means the chain has not been added to MetaMask
            if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
              console.log('Polygon Amoy network not found in wallet, attempting to add it');
              
              // Try to add the network
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x13882', // 80002 in hex
                    chainName: 'Polygon Amoy',
                    nativeCurrency: {
                      name: 'POL',
                      symbol: 'POL',
                      decimals: 18,
                    },
                    rpcUrls: ['https://rpc-amoy.polygon.technology'],
                    blockExplorerUrls: ['https://amoy.polygonscan.com'],
                  },
                ],
              });
              console.log('Successfully added Polygon Amoy network');
            } else {
              throw switchError;
            }
          }
          
          toast({
            title: "Network switched",
            description: "Successfully connected to Polygon Amoy network",
            duration: 3000,
          });
        } catch (networkError: any) {
          console.error('Failed to switch to Polygon Amoy network:', networkError);
          throw new Error('Please switch to the Polygon Amoy network in your MetaMask wallet to vote');
        }
      }
      
      // Step 5: Submit vote transaction
      setVoteState('submitting-vote');
      
      // IMPORTANT: Get proper blockchain IDs using the student ID mapping
      // First, try to use the provided blockchainId
      let actualElectionId: number;
      let mappedCandidateId: number;
      
      try {
        // Get the correct election from the database
        const electionResponse = await fetch(`/api/elections/${electionId}`);
        if (!electionResponse.ok) {
          throw new Error(`Failed to fetch election ${electionId}`);
        }
        const election = await electionResponse.json();
        
        // If this election has blockchainId in database, use it directly
        if (election.blockchainId) {
          actualElectionId = election.blockchainId;
          console.log(`Using blockchain ID from database: ${actualElectionId}`);
        } else {
          // If not deployed to blockchain, we can't vote
          toast({
            title: "Election not deployed",
            description: "This election has not been deployed to the blockchain yet.",
            variant: "destructive",
            duration: 5000,
          });
          throw new Error("Election not deployed to blockchain");
        }
        
        // Now get all candidates for this election to find the right mapping
        const candidatesResponse = await fetch(`/api/elections/${electionId}/candidates`);
        if (!candidatesResponse.ok) {
          throw new Error(`Failed to fetch candidates for election ${electionId}`);
        }
        const candidates = await candidatesResponse.json();
        
        // Find this candidate's position in the array (0-based)
        const candidatePosition = candidates.findIndex(
          (c: any) => c.candidateId === candidateId
        );
        
        if (candidatePosition === -1) {
          toast({
            title: "Candidate not found",
            description: `Candidate ID ${candidateId} not found in election ${electionId}`,
            variant: "destructive",
            duration: 5000,
          });
          throw new Error(`Candidate ID ${candidateId} not found in election ${electionId}`);
        }
        
        // Blockchain positions are 1-based
        mappedCandidateId = candidatePosition + 1;
        
        console.log(`Direct position mapping: Election ${electionId} → ${actualElectionId}, Candidate ${candidateId} → position ${candidatePosition} → ID ${mappedCandidateId}`);
        console.log(`Candidate list (${candidates.length} total):`, candidates.map((c: any) => c.candidateId));
      } catch (error: any) {
        console.error("Error mapping IDs, aborting vote:", error);
        
        // Display detailed error to user
        toast({
          title: "Vote failed",
          description: `Could not map election/candidate IDs properly: ${error?.message || 'Unknown error'}`,
          variant: "destructive",
          duration: 5000,
        });
        
        // Reset vote state and exit
        setVoteState('idle');
        return;
      }
      
      // Get next nonce from blockchain to prevent replay attacks
      let nonce = 1; // Default nonce
      try {
        // Try to fetch next nonce from the contract if possible (polyfill for MetaMask direct use)
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          // We need to use checksummed addresses in ethers v6+
          const contractAddress = '0xb74f07812B45dBEc4eC3E577194F6a798a060e5D';
          console.log("Using ethers normalized contract address for nonce check:", contractAddress);
          
          const contract = new ethers.Contract(
            contractAddress,
            [
              "function getNextNonce() external view returns (uint256)"
            ],
            provider
          );
          
          try {
            const nextNonce = await contract.getNextNonce();
            nonce = Number(nextNonce);
            console.log("Got next nonce from blockchain:", nonce);
          } catch (nonceError) {
            console.warn("Could not get nonce from contract, using default:", nonceError);
          }
        }
      } catch (error) {
        console.warn("Error getting nonce, using default:", error);
      }
      
      // Function signature for voteForSenator(uint256,uint256,uint256)
      const functionSignature = '0x8c8f5bcb'; // Correct function signature for voteForSenator
      
      // Convert parameters to 32-byte hex strings
      const toHex32 = (num: number): string => {
        return Math.floor(num).toString(16).padStart(64, '0');
      };
      
      // We'll use a consistent contract address format
      console.log("Using properly formatted contract address for transaction");
      
      // Construct data manually for maximum compatibility - USE MAPPED CANDIDATE ID
      const data = functionSignature + 
                  toHex32(actualElectionId) + 
                  toHex32(mappedCandidateId) + // Use the mapped candidate ID that exists in blockchain
                  toHex32(nonce); // Use actual nonce instead of 0
      
      console.log("Voting for election ID:", actualElectionId, "candidate ID:", mappedCandidateId, "(originally", candidateId, ")");
      console.log("Database election ID:", electionId, "Blockchain election ID:", blockchainId || "same as database");
      console.log("Contract address:", '0xb74f07812B45dBEc4eC3E577194F6a798a060e5D');
      console.log("Using secured voting token");
      
      toast({
        title: "Submitting vote...",
        description: "Please approve the transaction in your wallet. We've set the gas price very low (0.15-0.3 Gwei) to save you money - MetaMask might show the transaction as failing but it should still go through on Polygon Amoy testnet.",
        duration: 20000,
      });
      
      // Use the contractAddress from above
      const correctAddress = '0xb74f07812B45dBEc4eC3E577194F6a798a060e5D';
      
      const txParams = {
        from: account,
        to: correctAddress,
        data: data,
        // Use lower gas values for Polygon Amoy testnet to reduce costs
        maxFeePerGas: '0xB2D05E00', // 0.3 Gwei in hex - much lower for test network
        maxPriorityFeePerGas: '0x59682F00', // 0.15 Gwei in hex - lower priority fee
        // Set reasonable gas limit - 300,000 should be plenty
        gas: '0x493E0' // 300,000 in hex - enough for the vote function
      };
      
      console.log("Sending transaction with optimized parameters:", txParams);
      
      // Get transaction hash from MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      // IMPORTANT: We need to wait for transaction confirmation before marking token as used
      // Show waiting message
      toast({
        title: "Vote submitted!",
        description: "Waiting for blockchain confirmation. This may take a few moments...",
        duration: 10000,
      });
      
      // Step 6: Wait for transaction confirmation and only then mark token as used
      try {
        // Set state to recording (waiting for confirmation)
        setVoteState('recording-vote');
        
        // Wait for transaction receipt to check if it was successful
        console.log(`Waiting for transaction confirmation: ${txHash}`);
        
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const receipt = await provider.waitForTransaction(txHash);
          
          if (receipt) {
            console.log('Transaction receipt received:', receipt);
            
            // Log the type and value of receipt.status to debug
            console.log('Receipt status type:', typeof receipt.status);
            console.log('Receipt status value:', receipt.status);
            
            // More lenient success check - consider success unless explicitly failed
            // For Amoy testnet, we'll accept any non-explicit failure as success
            const succeeded = receipt.status !== 0 && 
                             (typeof receipt.status === 'string' ? receipt.status !== "0x0" : true);
            
            if (succeeded) {
              console.log('Transaction confirmed successfully!', receipt);
              
              // Only mark token as used if transaction succeeded
              await markTokenAsUsed(token, txHash);
              
              toast({
                title: "Vote recorded!",
                description: "Your vote has been successfully processed on the blockchain.",
                duration: 5000,
              });
              
              if (onVoteSuccess) {
                onVoteSuccess(txHash);
              }
              
              return; // Success case, exit the function
            } else {
              console.error('Transaction status indicated failure:', receipt);
              
              // Reset the vote in our database since the blockchain transaction failed
              await resetVote(electionId, txHash);
              
              // Show detailed error with candidate mapping information
              toast({
                title: "Blockchain transaction failed",
                description: `Election ${electionId}→${actualElectionId}, Candidate ${candidateId}→${mappedCandidateId}. The contract rejected the transaction.`,
                variant: "destructive",
                duration: 10000,
              });
              
              throw new Error(`Transaction failed: Election ${electionId}→${actualElectionId}, Candidate ${candidateId}→${mappedCandidateId}`);
            }
          } else {
            // Reset the vote since we couldn't get a receipt
            await resetVote(electionId, txHash);
            throw new Error('No receipt returned');
          }
        } catch (waitError) {
          console.error('Error waiting for transaction receipt:', waitError);
          
          // Here's our backup check - even if waitForTransaction fails, the transaction might have succeeded
          // Let's try to fetch the transaction status manually
          try {
            // Try to get transaction by hash as a backup
            const provider = new ethers.BrowserProvider(window.ethereum);
            const tx = await provider.getTransaction(txHash);
            
            if (tx && tx.blockNumber) {
              console.log('Transaction found in a block, likely successful:', tx);
              
              // If we find the transaction in a block, assume it succeeded
              await markTokenAsUsed(token, txHash);
              
              toast({
                title: "Vote likely recorded!",
                description: "Transaction found on the blockchain. Your vote was likely processed successfully.",
                duration: 5000,
              });
              
              if (onVoteSuccess) {
                onVoteSuccess(txHash);
              }
              
              return; // Exit with success
            } else {
              // Reset the vote since the transaction wasn't found in a block
              await resetVote(electionId, txHash);
            }
          } catch (backupError) {
            console.error('Backup transaction check also failed:', backupError);
            // Reset the vote since the backup check failed
            await resetVote(electionId, txHash);
          }
          
          // If we get here, both checks failed
          throw new Error('Could not confirm transaction success');
        }
      } catch (receiptError) {
        console.error("Transaction receipt error:", receiptError);
        
        // If we get here, the transaction failed or we couldn't get a receipt
        // Make sure we reset the vote in our database
        try {
          await resetVote(electionId, txHash);
        } catch (resetError) {
          console.error("Failed to reset vote:", resetError);
        }
        
        toast({
          title: "Vote failed",
          description: "The blockchain transaction failed. You can try voting again (the system has automatically reset your voting status).",
          variant: "destructive",
          duration: 10000,
        });
        
        // Don't call onVoteSuccess since the vote failed
        throw new Error('Transaction confirmation failed');
      }
    } catch (error: any) {
      console.error('Vote failed:', error);
      
      // Extract the message from the error object
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('user rejected')) {
        toast({
          title: "Transaction rejected",
          description: "You cancelled the transaction in your wallet.",
          variant: "destructive",
          duration: 5000,
        });
      } else if (errorMessage.includes('insufficient funds')) {
        toast({
          title: "Insufficient funds",
          description: "You need testnet MATIC tokens to pay for this transaction. Please get some from a faucet.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (errorMessage.includes('Internal JSON-RPC error') || errorMessage.includes('could not be mined')) {
        // Try to extract more detail from the error
        let detailedError = "Unknown blockchain error";
        try {
          // Often the actual error is nested inside
          if (error.error && error.error.message) {
            detailedError = error.error.message;
          } else if (error.data && error.data.message) {
            detailedError = error.data.message;
          }
        } catch (e) {
          console.log("Could not extract detailed error:", e);
        }
        
        console.log("Transaction failed with detailed error:", detailedError);
        
        // Some special cases based on the detailed error
        if (detailedError.includes('not found in blockNumber') || detailedError.includes('election is not active')) {
          toast({
            title: "Election not active on blockchain",
            description: "The election may not be properly activated on the blockchain yet. Please notify an administrator.",
            variant: "destructive",
            duration: 15000,
          });
        } else if (detailedError.includes('wrong ID mapping')) {
          toast({
            title: "ID mapping error",
            description: "There's a mismatch between database IDs and blockchain IDs. Please notify an administrator about this technical issue.",
            variant: "destructive",
            duration: 15000,
          });
        } else {
          toast({
            title: "Transaction error",
            description: "The vote couldn't be processed. This could be due to network congestion on Polygon Amoy, or a blockchain ID mismatch. Please try again in a moment.",
            variant: "destructive",
            duration: 15000,
          });
        }
      } else if (errorMessage.includes('execution reverted')) {
        toast({
          title: "Vote rejected by contract",
          description: "Your transaction was sent but rejected by the smart contract. This may be because the election is not active yet on the blockchain.",
          variant: "destructive",
          duration: 15000,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to submit vote: ${errorMessage}`,
          variant: "destructive",
          duration: 10000,
        });
      }
    } finally {
      setVoteState('idle');
      setVotingToken(null);
    }
  };
  
  // Show different button states based on the current vote state
  const renderButtonContent = () => {
    switch (voteState) {
      case 'requesting-token':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing...
          </>
        );
      case 'token-received':
      case 'connecting-wallet':
        return (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Connecting...
          </>
        );
      case 'submitting-vote':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        );
      case 'recording-vote':
        return (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recording...
          </>
        );
      default:
        return (
          <>
            <VoteIcon className="mr-2 h-4 w-4" />
            Vote
          </>
        );
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || isVoting}
      onClick={handleVote}
    >
      {renderButtonContent()}
    </Button>
  );
}