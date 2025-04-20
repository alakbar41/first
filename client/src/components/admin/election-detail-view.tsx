import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Election, getFacultyName } from "@shared/schema";
import { User, CalendarIcon, Clock, Users, ServerIcon, Database } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { deployElectionToBlockchain } from "../../lib/blockchain";

interface ElectionDetailViewProps {
  election: Election;
  className?: string;
}

export function AdminElectionDetailView({ election, className = "" }: ElectionDetailViewProps) {
  const { toast } = useToast();
  
  // Helper function to format dates
  function formatDate(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "MMM d, yyyy - HH:mm");
  }

  // Get status badge for election
  const getStatusBadge = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
  };

  // Simplified function to refresh election data
  const refreshElectionData = () => {
    // Invalidate the elections cache to refresh all components that use election data
    queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
    
    // Also invalidate any specific election query if it exists
    queryClient.invalidateQueries({ queryKey: [`/api/elections/${election.id}`] });
  };

  // Deploy election to blockchain using MetaMask
  const deployMutation = useMutation({
    mutationFn: async () => {
      // This function will handle both API call and MetaMask transaction
      return deployElectionToBlockchain(election.id);
    },
    onSuccess: (data) => {
      toast({
        title: "Election deployed to blockchain",
        description: "The election has been successfully deployed to the blockchain! Transaction confirmed.",
        variant: "default"
      });
      refreshElectionData();
    },
    onError: (error: any) => {
      let errorMessage = error.message || "Failed to deploy election to blockchain. Please try again.";
      let errorTitle = "Deployment failed";
      
      // Special handling for common MetaMask errors
      if (errorMessage.includes("user rejected") || errorMessage.includes("User denied")) {
        errorMessage = "Transaction was rejected in MetaMask. Please try again and approve the transaction.";
      } 
      // Insufficient funds detection
      else if (errorMessage.includes("insufficient funds")) {
        errorTitle = "Insufficient ETH balance";
        errorMessage = "Your wallet has insufficient ETH tokens to complete this transaction. Please add ETH tokens to your wallet on the Ethereum Sepolia testnet.";
      } 
      // Already deployed
      else if (errorMessage.includes("Election already exists") || errorMessage.includes("already deployed")) {
        errorMessage = "This election has already been deployed to the blockchain.";
      }
      // Blockchain RPC errors
      else if (errorMessage.includes("Internal JSON-RPC error")) {
        errorTitle = "Blockchain Network Error";
        errorMessage = "There was an issue with the blockchain transaction. Please refresh and try again.";
      }
      // Gas or fee errors
      else if (errorMessage.includes("gas") || errorMessage.includes("fee")) {
        errorTitle = "Transaction Fee Error";
        errorMessage = "Transaction failed due to fee issues. Try adjusting MetaMask settings or make sure your wallet has sufficient funds.";
      }
      // Contract execution errors with specific error types
      else if (errorMessage.includes("Invalid times")) {
        errorTitle = "Election Times Invalid";
        errorMessage = "The smart contract requires that the election start time must be in the future and end time must be after start time. The system will automatically adjust the start time, but please try again.";
      }
      else if (errorMessage.includes("At least two candidates required")) {
        errorTitle = "Not Enough Candidates";
        errorMessage = "The smart contract requires at least two candidates for the election. Please add more candidates and try again.";
      }
      else if (errorMessage.includes("Duplicate candidate")) {
        errorTitle = "Duplicate Candidates";
        errorMessage = "The smart contract detected duplicate candidate IDs. Please ensure all candidates have unique student IDs.";
      }
      else if (errorMessage.includes("Not authorized")) {
        errorTitle = "Authorization Error";
        errorMessage = "Your MetaMask account is not authorized to deploy elections. Only the contract owner can perform this action.";
      }
      // General contract execution errors
      else if (errorMessage.includes("execution reverted")) {
        errorTitle = "Contract Error";
        errorMessage = "The smart contract rejected the transaction. This might be due to a validation error or a problem with the election parameters.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Election Details Card */}
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white">{election.name}</CardTitle>
              <p className="text-purple-100 mt-1">{election.position}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Eligible Faculties</p>
                <p className="text-sm font-medium">
                  {election.position === "President/Vice President" 
                    ? "All Faculties" 
                    : election.eligibleFaculties.map(f => getFacultyName(f)).join(", ")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm font-medium">{formatDate(election.startDate)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-sm font-medium">{formatDate(election.endDate)}</p>
              </div>
            </div>
          </div>
          
          {election.description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-sm text-gray-700 mt-1">{election.description}</p>
            </div>
          )}
          
          {/* Status Section */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Election Status</h3>
              
              {/* Blockchain Status */}
              <div className="flex items-center gap-2">
                {election.blockchainId ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      <span>Blockchain ID: {election.blockchainId}</span>
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-3">
                This election is available for eligible students to vote during the active period.
              </p>
              
              {/* Blockchain Deployment Section */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <ServerIcon className="h-4 w-4 text-purple-600" />
                      Blockchain Deployment
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Deploy this election to the blockchain to enable secure, transparent voting.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {new Date(election.startDate) <= new Date() && 
                        "Note: Start date will be automatically adjusted to ensure it's in the future."}
                    </p>
                  </div>
                  
                  {!election.blockchainId ? (
                    <Button 
                      onClick={() => deployMutation.mutate()} 
                      disabled={deployMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {deployMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Preparing...
                        </>
                      ) : (
                        <>
                          <ServerIcon className="h-4 w-4 mr-2" />
                          Deploy to Blockchain
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span>Deployed to Blockchain</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}