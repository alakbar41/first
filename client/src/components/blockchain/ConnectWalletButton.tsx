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
      let title = "Connection Failed";
      let description = error.message || "Failed to connect wallet. Please make sure you have MetaMask installed.";
      
      // Detect contract verification errors specifically
      if (description.includes("No contract found") || 
          description.includes("Contract not found") ||
          description.includes("not a contract")) {
        title = "Smart Contract Not Found";
        description = "The voting smart contract was not found on the current network. Please make sure you are connected to the Polygon Amoy testnet and contact your administrator.";
      }
      
      toast({
        title: title,
        description: description,
        variant: "destructive",
        duration: 10000, // Keep the message visible longer
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isInitialized) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={`${className} bg-gray-50 border-gray-200 text-gray-500`}
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="font-medium">Initializing Blockchain...</span>
      </Button>
    );
  }

  if (isWalletConnected) {
    return (
      <div className="border border-purple-200 bg-purple-50 text-purple-800 rounded-md p-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-purple-100 p-1.5 rounded-full mr-3">
            <WalletIcon className="h-5 w-5 text-purple-700" />
          </div>
          <span className="font-medium">Connected</span>
        </div>
        <div className="bg-white px-3 py-1 rounded-full border border-purple-200 text-sm font-mono">
          {displayAddress}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      disabled={isConnecting}
      className={`${className} bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-none shadow-sm hover:shadow transition-all duration-200`}
    >
      {isConnecting ? (
        <div className="flex items-center justify-center w-full">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="font-medium">Connecting...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <WalletIcon className="mr-2 h-5 w-5" />
          <span className="font-medium">Connect Metamask Wallet</span>
        </div>
      )}
    </Button>
  );
}