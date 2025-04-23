import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchIcon, ArrowRightIcon, ClipboardCheckIcon, ExternalLinkIcon, AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function VerifyVote() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [transactionHash, setTransactionHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  if (!user) {
    navigate("/auth");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  // Admin users should be redirected to their dashboard
  if (user.isAdmin) {
    navigate("/admin");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to admin dashboard...</p>
      </div>
    );
  }

  const handleVerify = () => {
    if (!transactionHash.trim()) return;
    
    setIsVerifying(true);
    
    // Open the transaction in Polygon Mainnet Explorer
    window.open(`https://polygonscan.com/tx/${transactionHash.trim()}`, '_blank');
    
    // Reset after a short delay
    setTimeout(() => {
      setIsVerifying(false);
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Verify Your Vote on Blockchain</h1>
        </div>
        
        <div className="p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Introduction Card */}
            <Card>
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-purple-800 flex items-center">
                  <ClipboardCheckIcon className="mr-2 h-5 w-5" />
                  Blockchain Vote Verification
                </CardTitle>
                <CardDescription>
                  Confirm your vote is securely recorded on the Polygon Mainnet blockchain
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-700 mb-4">
                  UniVote uses blockchain technology to ensure your vote is 
                  securely and permanently recorded. This transparency allows you to independently verify 
                  that your vote was properly counted.
                </p>
                
                <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>How it works</AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-2">Each vote is recorded as a transaction on the Polygon Mainnet blockchain. After voting, you'll receive an email with your transaction hash.</p>
                    <p>Enter this hash below to view your transaction details on Polygon's blockchain explorer. This confirms your vote was recorded immutably.</p>
                  </AlertDescription>
                </Alert>
                
                <div className="mt-6">
                  <h3 className="text-md font-medium text-gray-800 mb-2">Enter Your Transaction Hash</h3>
                  <div className="flex space-x-2">
                    <Input 
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="0x1234..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleVerify}
                      disabled={!transactionHash.trim() || isVerifying}
                      className="bg-purple-700 hover:bg-purple-800"
                    >
                      {isVerifying ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Verifying...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <SearchIcon className="mr-2 h-4 w-4" />
                          Verify
                        </span>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Example: 0x1a2b3c4d5e6f...
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 border-t border-gray-100 flex justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Coming soon:</span> Automatic transaction hash delivery to your email
                </p>
                <a 
                  href="https://polygonscan.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center"
                >
                  <span>Polygon Explorer</span>
                  <ExternalLinkIcon className="ml-1 h-3.5 w-3.5" />
                </a>
              </CardFooter>
            </Card>
            
            {/* How to Read Results Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-800">How to Read Blockchain Results</CardTitle>
                <CardDescription>Understanding your transaction details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="mt-1 bg-purple-100 text-purple-800 rounded-full p-1 mr-3">
                      <span className="flex h-5 w-5 items-center justify-center font-medium">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Transaction Status</h4>
                      <p className="text-sm text-gray-600">Look for "Success" status to confirm your vote was recorded. A green checkmark indicates a successful transaction.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mt-1 bg-purple-100 text-purple-800 rounded-full p-1 mr-3">
                      <span className="flex h-5 w-5 items-center justify-center font-medium">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Method ID</h4>
                      <p className="text-sm text-gray-600">The voting method will appear as either "voteForSenator" or "voteForPresidentVP" depending on the election type.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mt-1 bg-purple-100 text-purple-800 rounded-full p-1 mr-3">
                      <span className="flex h-5 w-5 items-center justify-center font-medium">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Timestamp</h4>
                      <p className="text-sm text-gray-600">The exact date and time your vote was recorded on the blockchain.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="mt-1 bg-purple-100 text-purple-800 rounded-full p-1 mr-3">
                      <span className="flex h-5 w-5 items-center justify-center font-medium">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Block Confirmation</h4>
                      <p className="text-sm text-gray-600">The number of blockchain confirmations indicates how deeply your transaction is embedded in the blockchain.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </main>
    </div>
  );
}