import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ethers } from 'ethers';

// Contract ABI minimal fragment for voteForSenator
const ABI_FRAGMENT = [
  "function voteForSenator(uint256 electionId, uint256 candidateId, uint256 nonce) external returns (bool)"
];

// Contract address (same across the app)
// Fixed checksum address for contract
const CONTRACT_ADDRESS = '0xb74F07812B45dBEc4Ec3E577194F6a798A060e5D';

interface EmergencyVoteButtonProps {
  electionId: number;
  blockchainId?: number;
  candidateId: number;
  onVoteSuccess?: (txHash: string) => void;
  className?: string;
}

export function EmergencyVoteButton({ 
  electionId, 
  blockchainId, 
  candidateId, 
  onVoteSuccess,
  className = ""
}: EmergencyVoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();
  
  const handleEmergencyVote = async () => {
    try {
      setIsVoting(true);
      
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      // Set up provider and contract with absolute minimum functionality
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Create minimal contract interface just for this function
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI_FRAGMENT, signer);
      
      // Determine which election ID to use (blockchain ID if available, otherwise database ID)
      const actualElectionId = blockchainId || electionId;
      
      // Use populateTransaction to generate the transaction data
      const tx = await contract.voteForSenator.populateTransaction(
        actualElectionId, 
        candidateId,
        0 // nonce parameter required by the contract (not tx nonce)
      );
      
      // Add ultra-low gas settings
      const transaction = {
        ...tx,
        gasLimit: ethers.parseUnits("80000", "wei"), // Ultra-low gas limit - 80,000
        maxPriorityFeePerGas: ethers.parseUnits("0.5", "gwei"), // Absolute minimum priority fee
        maxFeePerGas: ethers.parseUnits("3.0", "gwei"), // Absolute minimum max fee
        type: 2 // EIP-1559 transaction type
      };
      
      toast({
        title: "Sending emergency vote",
        description: "Please confirm in MetaMask with the lowest possible gas settings",
      });
      
      // Send transaction with ultra-low gas settings
      const txResponse = await signer.sendTransaction(transaction);
      
      toast({
        title: "Vote transaction sent",
        description: "Waiting for confirmation...",
      });
      
      // Wait for just 1 confirmation for speed
      const receipt = await txResponse.wait(1);
      
      toast({
        title: "Vote successful!",
        description: "Your vote has been recorded on the blockchain with ultra-low gas settings",
        variant: "default"
      });
      
      if (onVoteSuccess && receipt) {
        onVoteSuccess(receipt.hash);
      }
    } catch (error: any) {
      console.error('Emergency vote failed:', error);
      toast({
        title: "Emergency voting failed",
        description: error.message || "Failed to submit vote with ultra-low gas. Try adjusting the gas manually in MetaMask.",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  return (
    <Button 
      variant="destructive" 
      size="sm"
      className={`${className}`}
      onClick={handleEmergencyVote}
      disabled={isVoting}
    >
      {isVoting ? "Processing..." : "🔥 Emergency Vote (Minimal Gas)"}
    </Button>
  );
}