import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/hooks/use-web3";
import { Loader2, Wallet } from "lucide-react";

interface ConnectWalletButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function ConnectWalletButton({ 
  variant = "default", 
  size = "default",
  className = "" 
}: ConnectWalletButtonProps) {
  const { isWalletConnected, walletAddress, connectWallet } = useWeb3();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = async () => {
    if (isWalletConnected) return;
    
    setIsConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleConnectWallet}
      disabled={isWalletConnected || isConnecting}
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : isWalletConnected ? (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(walletAddress)}
        </>
      ) : (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </>
      )}
    </Button>
  );
}