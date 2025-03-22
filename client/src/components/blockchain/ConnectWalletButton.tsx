import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2, WalletIcon } from "lucide-react";

interface ConnectWalletButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function ConnectWalletButton({ 
  variant = "secondary", 
  size = "default",
  className = ""
}: ConnectWalletButtonProps) {
  const { isInitialized, isWalletConnected, walletAddress, connectWallet } = useWeb3();
  const { toast } = useToast();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [displayAddress, setDisplayAddress] = useState("");

  useEffect(() => {
    if (walletAddress) {
      // Format the address to show only first 6 and last 4 characters
      setDisplayAddress(`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`);
    } else {
      setDisplayAddress("");
    }
  }, [walletAddress]);

  const handleConnect = async () => {
    if (!isInitialized) {
      toast({
        title: "Blockchain Not Initialized",
        description: "The blockchain connection is not yet initialized. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    if (isWalletConnected) return; // Already connected

    setIsConnecting(true);
    try {
      await connectWallet();
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet. Please make sure you have MetaMask installed.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isInitialized) {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className={className}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Initializing Blockchain...
      </Button>
    );
  }

  if (isWalletConnected) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`${className} cursor-default`}
      >
        <WalletIcon className="mr-2 h-4 w-4" />
        Connected: {displayAddress}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      disabled={isConnecting}
      className={className}
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <WalletIcon className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}