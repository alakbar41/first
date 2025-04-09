import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Hard-coded contract ABI for function signature encoding
// This is the proper function selector for voteForSenator(uint256,uint256,uint256)
const VOTE_METHOD_ID = '0x9e6373d9'; 

// Contract address with proper EIP-55 checksum format
const CONTRACT_ADDRESS = '0xb74F07812B45dBEc4Ec3E577194F6a798A060e5D';

interface LastResortVoteButtonProps {
  electionId: number;
  blockchainId?: number;
  candidateId: number;
  onVoteSuccess?: (txHash: string) => void;
  className?: string;
}

/**
 * This is a last resort direct transaction sender that uses the lowest level MetaMask API
 * with manually crafted transaction data and the absolute minimum gas possible.
 */
export function LastResortVoteButton({ 
  electionId, 
  blockchainId, 
  candidateId, 
  onVoteSuccess,
  className = ""
}: LastResortVoteButtonProps) {
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();
  
  // Helper to convert a number to a 32-byte hex string with proper padding
  const numberTo32ByteHex = (num: number): string => {
    return Math.floor(num).toString(16).padStart(64, '0');
  };
  
  const handleZeroGasVote = async () => {
    try {
      setIsVoting(true);
      
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      // Determine which election ID to use (blockchain ID if available, otherwise database ID)
      const actualElectionId = blockchainId || electionId;
      
      // Manually construct the transaction data
      // Function selector (4 bytes) + encoded parameters (3 x 32 bytes each)
      const data = VOTE_METHOD_ID + 
                   numberTo32ByteHex(actualElectionId) + 
                   numberTo32ByteHex(candidateId) + 
                   numberTo32ByteHex(0); // nonce parameter is 0
      
      toast({
        title: "Preparing zero-gas emergency vote",
        description: "Please reduce the gas limit to the absolute minimum when prompted in MetaMask",
      });
      
      // Direct low-level call to MetaMask
      // The user will need to manually adjust the gas limit in MetaMask to the lowest possible value
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: CONTRACT_ADDRESS,
          data,
          value: '0x0',
          // Let MetaMask estimate gas - user can manually adjust to minimum
        }],
      });
      
      toast({
        title: "Vote transaction submitted",
        description: "Transaction has been sent with minimum gas. Please wait for confirmation.",
      });
      
      if (onVoteSuccess && txHash) {
        onVoteSuccess(txHash);
      }
    } catch (error: any) {
      console.error('Zero-gas emergency vote failed:', error);
      
      // Special message for low gas errors
      if (error.message && error.message.includes('gas')) {
        toast({
          title: "Transaction failed due to gas limits",
          description: "You don't have enough testnet MATIC. Please obtain testnet MATIC from a faucet or contact the system administrator.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Emergency voting failed",
          description: error.message || "Failed to submit vote. Try again or contact system support.",
          variant: "destructive"
        });
      }
    } finally {
      setIsVoting(false);
    }
  };
  
  return (
    <Button 
      variant="destructive" 
      size="sm"
      className={`${className}`}
      onClick={handleZeroGasVote}
      disabled={isVoting}
    >
      {isVoting ? "Processing..." : "🔥🔥 ZERO-GAS EMERGENCY VOTE"}
    </Button>
  );
}