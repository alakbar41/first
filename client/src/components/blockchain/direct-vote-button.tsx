
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Contract details
const CONTRACT_ADDRESS = '0xb74f07812b45DBEc4eC3E577194F6a798a060e5D';
const ABI = [
  "function voteForSenator(uint256 electionId, uint256 candidateId, uint256 nonce) external returns (bool)"
];

// Direct vote component that bypasses the system limitations
export const DirectVoteButton = ({ electionId, candidateId }: { electionId: number, candidateId: number }) => {
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();

  const handleDirectVote = async () => {
    try {
      setIsVoting(true);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      
      // Get nonce for anti-replay protection (just use 0 for now)
      const nonce = 0;
      
      // Set ultra-low gas options
      const options = {
        gasLimit: 80000, // Absolute minimum
        maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"), // Absolute minimum
        maxFeePerGas: ethers.parseUnits("3.0", "gwei"), // Absolute minimum
        type: 2, // Use EIP-1559 transaction type
      };
      
      toast({
        title: "Attempting vote with minimum gas settings",
        description: "Please confirm in MetaMask when prompted",
      });
      
      // Prepare transaction
      const tx = await contract.voteForSenator.populateTransaction(electionId, candidateId, nonce);
      
      // Add our custom gas options
      const transaction = {
        ...tx,
        ...options
      };
      
      // Send transaction
      const txResponse = await signer.sendTransaction(transaction);
      
      toast({
        title: "Vote transaction sent",
        description: "Waiting for confirmation...",
      });
      
      // Wait for confirmation (just 1 confirmation)
      const receipt = await txResponse.wait(1);
      
      toast({
        title: "Vote successful!",
        description: "Your vote has been recorded on the blockchain",
        variant: "default"
      });
      
    } catch (error: any) {
      console.error("Direct voting error:", error);
      toast({
        title: "Voting failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Button 
      variant="destructive" 
      onClick={handleDirectVote} 
      disabled={isVoting}
      className="w-full mt-4"
    >
      {isVoting ? "Processing..." : "EMERGENCY: Direct Vote"}
    </Button>
  );
};

export default DirectVoteButton;
