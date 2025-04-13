import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface EnhancedBlockchainDeploymentStatusProps {
  contractAddress?: string;
  onConnect?: () => void;
}

export function EnhancedBlockchainDeploymentStatus({
  contractAddress,
  onConnect
}: EnhancedBlockchainDeploymentStatusProps) {
  const { toast } = useToast();
  const { 
    isInitialized, 
    isInitializing, 
    initializationError,
    isWalletConnected,
    walletAddress,
    connectWallet,
    reinitialize 
  } = useStudentIdWeb3();
  
  const [connecting, setConnecting] = useState(false);
  
  const handleConnectWallet = async () => {
    try {
      setConnecting(true);
      await connectWallet();
      
      toast({
        title: "Wallet Connected",
        description: "Your blockchain wallet has been connected successfully.",
      });
      
      if (onConnect) onConnect();
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to your wallet. Please ensure MetaMask is installed and unlocked.",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };
  
  const handleReinitialize = async () => {
    try {
      await reinitialize();
      
      toast({
        title: "Blockchain Reconnected",
        description: "Successfully reconnected to the blockchain network.",
      });
    } catch (error: any) {
      toast({
        title: "Reconnection Failed",
        description: error.message || "Failed to reconnect to the blockchain network.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-lg flex items-center">
          <Info className="mr-2 h-5 w-5" />
          Enhanced Blockchain Integration Status
        </CardTitle>
        <CardDescription>
          Status of the connection to the enhanced student ID-based voting contract
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-4">
        {initializationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Initialization Error</AlertTitle>
            <AlertDescription>
              {initializationError}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Contract Address:</span>
            <span className="text-xs font-mono bg-muted p-1 rounded">
              {contractAddress || 'Not configured'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Blockchain Connection:</span>
            <Badge variant={isInitialized ? "outline" : "destructive"}>
              {isInitializing ? 'Connecting...' : isInitialized ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Wallet Status:</span>
            <Badge variant={isWalletConnected ? "outline" : "secondary"}>
              {isWalletConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          
          {isWalletConnected && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Wallet Address:</span>
              <span className="text-xs font-mono bg-muted p-1 rounded overflow-hidden text-ellipsis max-w-[200px]">
                {walletAddress}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 bg-muted/30 py-4">
        {!isWalletConnected ? (
          <Button 
            variant="default" 
            className="w-full"
            onClick={handleConnectWallet}
            disabled={connecting || !isInitialized}
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting Wallet...
              </>
            ) : (
              'Connect Wallet'
            )}
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleReinitialize}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              'Reconnect'
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}