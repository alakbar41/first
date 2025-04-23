import { 
  AlertTriangleIcon,
  ArrowRightIcon, 
  CheckCircle2Icon, 
  ClipboardIcon, 
  CoinsIcon, 
  ExternalLinkIcon,
  KeyIcon,
  ListOrderedIcon,
  ShieldIcon,
  WalletIcon
} from "lucide-react";
import { Link } from "wouter";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GuidelinesPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <StudentSidebar user={user} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-6">
        {/* Page header */}
        <div className="px-4 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center">
            <ListOrderedIcon className="w-6 h-6 mr-3 text-purple-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Voting Guidelines
            </h1>
          </div>
        </div>
        
        {/* Page content */}
        <div className="p-4 md:p-6">
          <Tabs defaultValue="metamask" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="metamask">
                <WalletIcon className="w-4 h-4 mr-2" />
                <span>MetaMask Setup</span>
              </TabsTrigger>
              <TabsTrigger value="polygon">
                <ShieldIcon className="w-4 h-4 mr-2" />
                <span>Polygon Network</span>
              </TabsTrigger>
              <TabsTrigger value="vote">
                <CheckCircle2Icon className="w-4 h-4 mr-2" />
                <span>Voting Process</span>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[calc(100vh-240px)]">
              <TabsContent value="metamask" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <WalletIcon className="w-5 h-5 mr-2 text-purple-600" />
                      Setting Up MetaMask Wallet
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to set up your MetaMask wallet for blockchain voting
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                        Install MetaMask Extension
                      </h3>
                      <p className="text-gray-600 ml-8">
                        First, you'll need to install the MetaMask extension for your browser.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <a 
                          href="https://metamask.io/en-GB/download/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-purple-600 font-medium hover:text-purple-800 transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4 mr-2" />
                          Click here to download and install MetaMask
                          <ExternalLinkIcon className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </div>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">After installation, you'll see the MetaMask fox icon in your browser's toolbar.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                        Create a New Wallet
                      </h3>
                      <p className="text-gray-600 ml-8">
                        Click on the MetaMask icon in your browser and follow the steps to create a new wallet.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>Click "Create a new wallet"</li>
                          <li>Create a strong password that you'll remember</li>
                          <li>Watch the short video about securing your wallet</li>
                          <li>Reveal and secure your Secret Recovery Phrase</li>
                        </ol>
                      </div>
                    </div>
                    
                    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                      <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
                      <AlertTitle className="text-yellow-800 font-bold">Important Security Warning</AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        <p className="mb-2"><strong>NEVER share your Secret Recovery Phrase (12-word seed phrase) with anyone!</strong></p>
                        <p className="mb-2">MetaMask cannot recover your wallet if you lose this phrase. Write it down and store it securely offline.</p>
                        <div className="mt-3">
                          <img 
                            src="/assets/firefoxmetamask.png" 
                            alt="Example of a MetaMask seed phrase screen (with words blurred)" 
                            className="rounded-lg border border-yellow-300 max-w-full" 
                          />
                          <p className="text-xs mt-2 text-yellow-700 italic">
                            Example of a seed phrase screen in MetaMask. Store these 12 words securely as they are the only way to recover your wallet if you lose access!
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                        Verify Your Secret Recovery Phrase
                      </h3>
                      <p className="text-gray-600 ml-8">
                        MetaMask will ask you to confirm your Secret Recovery Phrase by selecting the words in the correct order.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">After verification, your wallet is ready to use!</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 flex">
                      <div className="mr-3 mt-1 flex-shrink-0">
                        <ClipboardIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-blue-800 font-medium">Need more help?</h4>
                        <p className="text-blue-700 text-sm">
                          For detailed instructions and troubleshooting, visit the official MetaMask support page.
                        </p>
                        <a 
                          href="https://support.metamask.io/start/getting-started-with-metamask/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                        >
                          View MetaMask Help Guide
                          <ExternalLinkIcon className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="polygon" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShieldIcon className="w-5 h-5 mr-2 text-purple-600" />
                      Connecting to Polygon Network
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to connect your MetaMask wallet to the Polygon network
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                        Add Polygon Network to MetaMask
                      </h3>
                      <p className="text-gray-600 ml-8">
                        UniVote uses the Polygon Mumbai Testnet for secure and efficient voting.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                        <p className="text-sm text-gray-600">To add the Polygon Mumbai Testnet to MetaMask:</p>
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>Open MetaMask and click on the network dropdown at the top (usually says "Ethereum Mainnet")</li>
                          <li>Click "Add network"</li>
                          <li>Click "Add a network manually"</li>
                          <li>Fill in the following details:</li>
                        </ol>
                        <div className="bg-white p-3 rounded border border-gray-300 space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium text-gray-700">Network Name:</span>
                            <span className="col-span-2 text-gray-800">Polygon Mumbai</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium text-gray-700">RPC URL:</span>
                            <span className="col-span-2 text-gray-800">https://rpc-mumbai.maticvigil.com/</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium text-gray-700">Chain ID:</span>
                            <span className="col-span-2 text-gray-800">80001</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium text-gray-700">Currency Symbol:</span>
                            <span className="col-span-2 text-gray-800">MATIC</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <span className="font-medium text-gray-700">Block Explorer URL:</span>
                            <span className="col-span-2 text-gray-800">https://mumbai.polygonscan.com/</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">Click "Save" to add the network.</p>
                        
                        <div className="mt-4">
                          <p className="mb-2 text-sm font-medium text-gray-700">After adding the network, you can select it from your network list:</p>
                          <img 
                            src="/assets/network-selection.png" 
                            alt="MetaMask network selection showing Polygon Mainnet" 
                            className="rounded-md border border-gray-300 max-w-full mx-auto"
                          />
                          <p className="mt-2 text-xs text-gray-500 italic">
                            Select "Polygon Mainnet" from your networks list when you want to interact with the blockchain
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                        Get Test MATIC Tokens
                      </h3>
                      <p className="text-gray-600 ml-8">
                        You'll need some test MATIC tokens to pay for transaction fees when voting.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                        <p className="text-sm text-gray-600">Get free test MATIC from the Polygon Faucet:</p>
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>Make sure you've switched to the Polygon Mumbai network in MetaMask</li>
                          <li>Copy your wallet address by clicking on your account name in MetaMask</li>
                          <li>Visit the Polygon Faucet website</li>
                          <li>Paste your wallet address and request test MATIC</li>
                        </ol>
                        <a 
                          href="https://faucet.polygon.technology/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-purple-600 font-medium hover:text-purple-800 transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4 mr-2" />
                          Visit Polygon Faucet
                          <ExternalLinkIcon className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                        Verify Your Balance
                      </h3>
                      <p className="text-gray-600 ml-8">
                        After requesting test MATIC, verify that you received them in your MetaMask wallet.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">You should see your MATIC balance in your MetaMask wallet. If you don't see the tokens after a few minutes, try requesting again.</p>
                      </div>
                    </div>
                    
                    <Alert className="bg-green-50 border-green-200">
                      <CoinsIcon className="h-5 w-5 text-green-600" />
                      <AlertTitle className="text-green-800 font-bold">You're Ready to Vote!</AlertTitle>
                      <AlertDescription className="text-green-700">
                        With MetaMask set up and connected to Polygon Mumbai with test MATIC, you're ready to participate in UniVote elections. Voting transactions typically cost very small amounts of MATIC (less than 0.01 MATIC per vote).
                      </AlertDescription>
                    </Alert>
                    
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="vote" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle2Icon className="w-5 h-5 mr-2 text-purple-600" />
                      How to Vote
                    </CardTitle>
                    <CardDescription>
                      Follow these steps to cast your vote in an election
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">1</span>
                        Browse Active Elections
                      </h3>
                      <p className="text-gray-600 ml-8">
                        From the dashboard, you can view all active elections that you're eligible to participate in.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Link to="/">
                          <Button variant="outline" className="flex items-center text-purple-600 hover:text-purple-800 border-purple-200 hover:border-purple-300">
                            <ArrowRightIcon className="w-4 h-4 mr-2" />
                            Go to Elections Dashboard
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">2</span>
                        Select an Election and Candidate
                      </h3>
                      <p className="text-gray-600 ml-8">
                        Click on an active election to view details and candidates.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>Review the election details, including position and eligibility</li>
                          <li>Browse the list of candidates and their information</li>
                          <li>Select your preferred candidate</li>
                          <li>Click the "Vote" button</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">3</span>
                        Confirm with MetaMask
                      </h3>
                      <p className="text-gray-600 ml-8">
                        When you vote, MetaMask will ask you to confirm the transaction.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                        <p className="text-sm text-gray-600">The MetaMask popup will show:</p>
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>The transaction details (voting in an election)</li>
                          <li>The estimated gas fee (small amount of MATIC)</li>
                          <li>Click "Confirm" to cast your vote</li>
                        </ol>
                        <Alert className="bg-blue-50 border-blue-200 mt-2">
                          <KeyIcon className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-700 text-sm">
                            Your vote is cast anonymously on the blockchain. The system only records that you participated, not who you voted for.
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">4</span>
                        Receive Confirmation
                      </h3>
                      <p className="text-gray-600 ml-8">
                        After your vote is processed, you'll receive confirmation.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <ol className="list-decimal pl-5 space-y-2 text-gray-600">
                          <li>The system will show a success message when your vote is recorded</li>
                          <li>You'll receive an email confirmation with your transaction hash</li>
                          <li>You can use this transaction hash to verify your vote on the blockchain explorer</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium flex items-center text-purple-800">
                        <span className="bg-purple-100 text-purple-800 font-bold rounded-full w-6 h-6 inline-flex items-center justify-center mr-2">5</span>
                        Verify Your Vote
                      </h3>
                      <p className="text-gray-600 ml-8">
                        You can verify that your vote was recorded on the blockchain.
                      </p>
                      <div className="ml-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Link to="/verify-vote">
                          <Button variant="outline" className="flex items-center text-purple-600 hover:text-purple-800 border-purple-200 hover:border-purple-300">
                            <ArrowRightIcon className="w-4 h-4 mr-2" />
                            Go to Vote Verification
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    <Alert className="bg-gray-50 border-gray-200">
                      <ClipboardIcon className="h-5 w-5 text-gray-600" />
                      <AlertTitle className="text-gray-800 font-bold">Election Results</AlertTitle>
                      <AlertDescription className="text-gray-700">
                        After an election closes, you can view the results in the "Results" section of the UniVote platform. All voting results are tallied from the blockchain, ensuring complete transparency and accuracy.
                      </AlertDescription>
                    </Alert>
                    
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </main>
    </div>
  );
}