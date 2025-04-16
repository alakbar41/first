import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ImprovedBlockchainSyncButton } from "@/components/admin/ImprovedBlockchainSyncButton";
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import { useUniversityVoting } from '@/hooks/use-university-voting';
import { BlockchainRoleManager } from '@/components/admin/blockchain-role-manager';
import { BlockchainVerificationPanel } from '@/components/admin/blockchain-verification-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedBlockchainDeploymentStatus } from "@/components/admin/enhanced-blockchain-deployment-status";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import UniversityVotingSyncButton from "@/components/admin/university-voting-sync-button";

export default function AdminBlockchain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { isInitialized: isOldInitialized, walletAddress: oldWalletAddress, connectWallet: oldConnectWallet } = useStudentIdWeb3();
  const { isInitialized: isNewInitialized, walletAddress: newWalletAddress, connectWallet: newConnectWallet } = useUniversityVoting();
  
  // Use the newest contract wallet when available
  const walletAddress = newWalletAddress || oldWalletAddress;
  const connectWallet = newConnectWallet || oldConnectWallet;
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user.isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <AdminSidebar user={user} />
      
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Blockchain Administration</h1>
            
            <div className="flex space-x-2">
              {!walletAddress ? (
                <Button onClick={() => connectWallet()} variant="outline">
                  <Shield className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              ) : (
                <div className="flex items-center border rounded-md px-3 py-1 bg-muted/50">
                  <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-sm font-mono">
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-muted-foreground">
              Manage blockchain settings, roles, and synchronization between database and blockchain.
            </p>
          </div>
          
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roles">Role Management</TabsTrigger>
              <TabsTrigger value="sync">Synchronization</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Blockchain Status</CardTitle>
                  <CardDescription>
                    Current status of blockchain voting implementation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <EnhancedBlockchainDeploymentStatus />
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">Contract Address</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="font-mono text-sm break-all">
                          0x64c0f44Adf0a88760DAD24747653e640551b893b
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Deployed on Polygon Amoy Testnet
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base">Contract Features</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="text-sm space-y-1">
                          <li className="flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                            Role-Based Access Control
                          </li>
                          <li className="flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                            Student ID Mapping
                          </li>
                          <li className="flex items-center">
                            <ShieldCheck className="h-4 w-4 mr-2 text-green-500" />
                            Enhanced Error Handling
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="roles" className="mt-6">
              <BlockchainRoleManager />
            </TabsContent>
            
            <TabsContent value="sync" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Database-Blockchain Synchronization</CardTitle>
                  <CardDescription>
                    Sync elections, candidates, and voter registrations between the database and blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-md p-4 border">
                    <h3 className="font-medium mb-2 flex items-center">
                      <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
                      Sync Process Warning
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Synchronization will deploy elections, register candidates with student IDs, and link them on the blockchain.
                      This process requires multiple blockchain transactions and may take some time.
                      Please ensure your wallet has sufficient MATIC tokens on the Polygon Amoy testnet.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4 justify-center pt-4">
                    <div className="relative">
                      <div className="w-full p-4 border rounded-md bg-purple-50 dark:bg-purple-950">
                        <h3 className="font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-2 text-purple-500" />
                          New Contract Available
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-400 mb-4">
                          The new UniversityVoting contract with improved features is now available for synchronization.
                          This contract uses timestamp-based election identifiers and supports both individual senator
                          candidates and president/VP tickets.
                        </p>
                        <div className="flex justify-end">
                          <UniversityVotingSyncButton />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <ImprovedBlockchainSyncButton className="w-full md:w-auto" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <BlockchainVerificationPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}