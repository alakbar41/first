import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStudentIdWeb3 } from '@/hooks/use-student-id-web3';
import studentIdWeb3Service from '@/lib/student-id-web3-service';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Shield, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlockchainRoleManagerProps {
  className?: string;
}

export function BlockchainRoleManager({ className = '' }: BlockchainRoleManagerProps) {
  const { toast } = useToast();
  const { isInitialized, walletAddress, connectWallet } = useStudentIdWeb3();
  
  const [targetAddress, setTargetAddress] = useState('');
  const [roleConstants, setRoleConstants] = useState<{
    ADMIN_ROLE: string;
    ELECTION_MANAGER_ROLE: string;
    VOTER_MANAGER_ROLE: string;
  } | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isElectionManager, setIsElectionManager] = useState(false);
  const [isVoterManager, setIsVoterManager] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Target address role states
  const [targetHasAdmin, setTargetHasAdmin] = useState(false);
  const [targetHasElectionManager, setTargetHasElectionManager] = useState(false);
  const [targetHasVoterManager, setTargetHasVoterManager] = useState(false);
  
  // Load role constants on init
  useEffect(() => {
    if (isInitialized) {
      loadRoleConstants();
      checkCurrentWalletRoles();
    }
  }, [isInitialized, walletAddress]);
  
  const loadRoleConstants = async () => {
    try {
      const roles = await studentIdWeb3Service.getRoleConstants();
      setRoleConstants(roles);
    } catch (error) {
      console.error('Failed to load role constants:', error);
    }
  };
  
  const checkCurrentWalletRoles = async () => {
    if (!walletAddress) return;
    
    try {
      const [admin, electionManager, voterManager] = await Promise.all([
        studentIdWeb3Service.isAdmin(),
        studentIdWeb3Service.isElectionManager(),
        studentIdWeb3Service.isVoterManager()
      ]);
      
      setIsAdmin(admin);
      setIsElectionManager(electionManager);
      setIsVoterManager(voterManager);
    } catch (error) {
      console.error('Failed to check current wallet roles:', error);
    }
  };
  
  const checkTargetAddressRoles = async () => {
    if (!roleConstants || !targetAddress) return;
    
    try {
      setIsChecking(true);
      
      const [hasAdmin, hasElectionManager, hasVoterManager] = await Promise.all([
        studentIdWeb3Service.contract.hasRole(roleConstants.ADMIN_ROLE, targetAddress),
        studentIdWeb3Service.contract.hasRole(roleConstants.ELECTION_MANAGER_ROLE, targetAddress),
        studentIdWeb3Service.contract.hasRole(roleConstants.VOTER_MANAGER_ROLE, targetAddress)
      ]);
      
      setTargetHasAdmin(hasAdmin);
      setTargetHasElectionManager(hasElectionManager);
      setTargetHasVoterManager(hasVoterManager);
      
      toast({
        title: "Roles Checked",
        description: `Checked roles for address ${targetAddress.substring(0, 8)}...`,
      });
    } catch (error: any) {
      console.error('Failed to check target address roles:', error);
      toast({
        title: "Role Check Failed",
        description: error.message || "Failed to check roles for the target address",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };
  
  const handleUpdateRoles = async () => {
    if (!roleConstants || !targetAddress) return;
    
    try {
      setIsLoading(true);
      
      // Create arrays for manageRoles function
      const roles = [
        roleConstants.ADMIN_ROLE,
        roleConstants.ELECTION_MANAGER_ROLE,
        roleConstants.VOTER_MANAGER_ROLE
      ];
      
      const grantValues = [
        targetHasAdmin,
        targetHasElectionManager,
        targetHasVoterManager
      ];
      
      await studentIdWeb3Service.manageRoles(targetAddress, roles, grantValues);
      
      toast({
        title: "Roles Updated",
        description: `Updated roles for address ${targetAddress.substring(0, 8)}...`,
      });
    } catch (error: any) {
      console.error('Failed to update roles:', error);
      toast({
        title: "Role Update Failed",
        description: error.message || "Failed to update roles for the target address",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const connectWalletHandler = async () => {
    try {
      await connectWallet();
    } catch (error: any) {
      toast({
        title: "Wallet Connection Failed",
        description: error.message || "Could not connect to wallet",
        variant: "destructive"
      });
    }
  };
  
  // Render information about current wallet
  const renderCurrentWalletInfo = () => {
    if (!walletAddress) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Connect your wallet to manage roles</p>
          <Button onClick={connectWalletHandler}>
            <Shield className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Connected Address:</p>
          <Badge variant="outline" className="font-mono text-xs">
            {walletAddress.substring(0, 10)}...{walletAddress.substring(walletAddress.length - 8)}
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={isAdmin ? "default" : "outline"} className={isAdmin ? "bg-green-600" : ""}>
            <ShieldCheck className="mr-1 h-3 w-3" />
            Admin Role
          </Badge>
          
          <Badge variant={isElectionManager ? "default" : "outline"} className={isElectionManager ? "bg-blue-600" : ""}>
            <Users className="mr-1 h-3 w-3" />
            Election Manager
          </Badge>
          
          <Badge variant={isVoterManager ? "default" : "outline"} className={isVoterManager ? "bg-purple-600" : ""}>
            <Users className="mr-1 h-3 w-3" />
            Voter Manager
          </Badge>
        </div>
        
        {!isAdmin && (
          <p className="text-sm text-amber-600 mt-2">
            <ShieldAlert className="inline mr-1 h-3 w-3" />
            You need the Admin role to manage other addresses' roles
          </p>
        )}
      </div>
    );
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Blockchain Role Manager</CardTitle>
        <CardDescription>
          Manage role-based access control for the blockchain voting contract
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Current wallet information */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your Wallet</h3>
          {renderCurrentWalletInfo()}
        </div>
        
        <Separator />
        
        {/* Target address role management */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Manage Roles</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label htmlFor="targetAddress">Target Wallet Address</Label>
              <div className="flex space-x-2">
                <Input 
                  id="targetAddress" 
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={!isAdmin || isLoading || isChecking}
                  className="font-mono"
                />
                <Button 
                  onClick={checkTargetAddressRoles}
                  disabled={!isAdmin || !targetAddress || isLoading || isChecking}
                  variant="outline"
                >
                  {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Roles"}
                </Button>
              </div>
            </div>
            
            {targetAddress && (
              <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="adminRole"
                    checked={targetHasAdmin}
                    onCheckedChange={(checked) => setTargetHasAdmin(checked === true)}
                    disabled={!isAdmin || isLoading}
                  />
                  <Label htmlFor="adminRole" className="cursor-pointer">Admin Role</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="electionManagerRole"
                    checked={targetHasElectionManager}
                    onCheckedChange={(checked) => setTargetHasElectionManager(checked === true)}
                    disabled={!isAdmin || isLoading}
                  />
                  <Label htmlFor="electionManagerRole" className="cursor-pointer">Election Manager Role</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="voterManagerRole"
                    checked={targetHasVoterManager}
                    onCheckedChange={(checked) => setTargetHasVoterManager(checked === true)}
                    disabled={!isAdmin || isLoading}
                  />
                  <Label htmlFor="voterManagerRole" className="cursor-pointer">Voter Manager Role</Label>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleUpdateRoles}
          disabled={!isAdmin || !targetAddress || isLoading || isChecking}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Roles...
            </>
          ) : (
            "Update Roles"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}