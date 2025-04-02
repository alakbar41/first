import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { Loader2 } from "lucide-react";
import { registerVotersBatch } from '@/lib/improved-blockchain-integration';

interface RegisterVotersButtonProps {
  voterAddresses: string[];
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
  onSuccess?: () => void;
}

export function RegisterVotersButton({ 
  voterAddresses,
  variant = "default",
  size = "default",
  className = "",
  onSuccess
}: RegisterVotersButtonProps) {
  const { toast } = useToast();
  const { isWalletConnected, connectWallet } = useWeb3();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const handleRegister = async () => {
    if (voterAddresses.length === 0) {
      toast({
        title: "No addresses to register",
        description: "Please provide a list of Ethereum addresses to register as voters.",
        variant: "destructive",
      });
      return;
    }
    
    if (!isWalletConnected) {
      try {
        await connectWallet();
      } catch (error) {
        toast({
          title: "Wallet connection required",
          description: "Please connect your wallet to register voters.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsRegistering(true);
    try {
      await registerVotersBatch(voterAddresses);
      
      toast({
        title: "Voters Registered Successfully",
        description: `Successfully registered ${voterAddresses.length} voter addresses on the blockchain.`,
        variant: "default",
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to Register Voters",
        description: error.message || "An error occurred while registering voters on the blockchain.",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleRegister}
      disabled={isRegistering || voterAddresses.length === 0}
    >
      {isRegistering ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Registering Voters...
        </>
      ) : (
        "Register Voters on Blockchain"
      )}
    </Button>
  );
}