import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, AlertTriangle, Search, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import studentIdWeb3Service from "@/lib/student-id-web3-service";
import web3Service from "@/lib/improved-web3-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface VerificationResult {
  exists: boolean;
  details?: any;
  error?: string;
}

interface CandidateVerificationResult extends VerificationResult {
  blockchainId?: number;
  studentId?: string;
  registeredForElection?: boolean;
  voteCount?: number;
}

interface ElectionVerificationResult extends VerificationResult {
  blockchainId?: number;
  registeredCandidateIds?: number[];
  startTime?: number;
  endTime?: number;
  type?: number;
  state?: number;
}

export function BlockchainVerificationPanel() {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [electionVerificationResult, setElectionVerificationResult] = useState<ElectionVerificationResult | null>(null);
  const [candidatesVerificationResults, setCandidatesVerificationResults] = useState<Record<number, CandidateVerificationResult>>({});

  // Fetch elections from the database
  const { data: elections = [], isLoading: isLoadingElections, refetch: refetchElections } = useQuery({
    queryKey: ['/api/elections'],
    queryFn: async () => {
      const response = await fetch('/api/elections');
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    },
  });

  // Fetch candidates when an election is selected
  const { data: electionCandidates = [], isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ['/api/elections', selectedElectionId, 'candidates'],
    queryFn: async () => {
      if (!selectedElectionId) return [];
      const response = await fetch(`/api/elections/${selectedElectionId}/candidates`);
      if (!response.ok) throw new Error(`Failed to fetch candidates for election ${selectedElectionId}`);
      return response.json();
    },
    enabled: !!selectedElectionId,
  });

  // Fetch full candidate details for each candidate in the election
  const { data: candidateDetails = [] } = useQuery({
    queryKey: ['/api/candidates', electionCandidates],
    queryFn: async () => {
      if (!electionCandidates.length) return [];
      
      // Collect all candidate IDs from the election-candidates relation
      const candidateIds = electionCandidates.map((ec: any) => ec.candidateId);
      
      // Fetch each candidate's full details
      const candidates = await Promise.all(
        candidateIds.map(async (id: number) => {
          const response = await fetch(`/api/candidates/${id}`);
          if (!response.ok) throw new Error(`Failed to fetch candidate ${id}`);
          return response.json();
        })
      );
      
      return candidates;
    },
    enabled: !!electionCandidates.length,
  });

  const verifyElectionOnBlockchain = async (election: any) => {
    try {
      // Connect to blockchain with wallet if possible
      try {
        console.log("Connecting wallet for full blockchain access...");
        await studentIdWeb3Service.connectWallet();
        console.log("Wallet connected successfully:", studentIdWeb3Service.getWalletAddress());
      } catch (walletError) {
        console.warn("Failed to connect wallet, verification may be limited:", walletError);
        // Continue anyway, as we can still perform read operations
      }
      
      // Initialize web3 services
      console.log("Initializing web3 services for verification...");
      // Try multiple times if needed for reliable connection
      let web3Initialized = false;
      let studentIdInitialized = false;
      
      // Try up to 3 times to initialize web3 services
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          [web3Initialized, studentIdInitialized] = await Promise.all([
            web3Service.initialize(),
            studentIdWeb3Service.initialize()
          ]);
          
          console.log(`Web3 service initialization results (attempt ${attempt}): web3Service=${web3Initialized}, studentIdWeb3Service=${studentIdInitialized}`);
          
          if (web3Initialized && studentIdInitialized) {
            break; // Success, no need for more attempts
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log("Retrying web3 service initialization...");
          }
        } catch (initError) {
          console.error(`Web3 initialization error (attempt ${attempt}):`, initError);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!web3Initialized || !studentIdInitialized) {
        throw new Error("Failed to initialize blockchain services after multiple attempts");
      }
      
      // Reset previous verification results
      setElectionVerificationResult(null);
      setCandidatesVerificationResults({});
      
      // Check if election exists on blockchain
      let electionExists = false;
      let electionDetails: any = null;
      try {
        if (!election.blockchainId) {
          throw new Error("Election has no blockchain ID in database");
        }
        
        // Try to get election details from blockchain
        console.log(`Fetching election details for blockchain ID ${election.blockchainId}...`);
        electionDetails = await web3Service.getElectionDetails(election.blockchainId);
        console.log("Successfully retrieved election details:", electionDetails);
        electionExists = true;
      } catch (error: any) {
        console.error("Failed to get election details:", error);
        
        // Try one more time with studentIdWeb3Service as fallback
        try {
          console.log("Trying to get election details using alternative service...");
          electionDetails = await studentIdWeb3Service.getElectionDetails(election.blockchainId);
          console.log("Successfully retrieved election details using alternative service:", electionDetails);
          electionExists = true;
        } catch (fallbackError) {
          console.error("Alternative service also failed:", fallbackError);
          // Update the state with the verification failure
          setElectionVerificationResult({
            exists: false,
            error: error.message || "Failed to find election on blockchain"
          });
          return;
        }
      }
      
      // Election found on blockchain, save details
      setElectionVerificationResult({
        exists: true,
        blockchainId: election.blockchainId,
        startTime: electionDetails.startTime,
        endTime: electionDetails.endTime,
        type: electionDetails.electionType,
        state: electionDetails.state,
        details: electionDetails
      });
      
      // Now verify each candidate
      const newCandidateResults: Record<number, CandidateVerificationResult> = {};
      
      // Process each candidate
      for (const candidate of candidateDetails) {
        try {
          if (!candidate.studentId) {
            throw new Error("Candidate has no student ID");
          }
          
          // Check if candidate exists on blockchain by student ID
          let blockchainCandidateId: number | null = null;
          try {
            blockchainCandidateId = await studentIdWeb3Service.getCandidateIdByStudentId(candidate.studentId);
          } catch (candidateError: any) {
            newCandidateResults[candidate.id] = {
              exists: false,
              studentId: candidate.studentId,
              error: candidateError.message || "Candidate not found on blockchain"
            };
            continue; // Skip to next candidate
          }
          
          // Candidate exists on blockchain, now check if registered for this election
          let registeredForElection = false;
          let electionCandidateIds: number[] = [];
          try {
            // Get all candidates for the election from blockchain - try multiple times
            console.log(`Getting candidates for election with blockchain ID ${election.blockchainId}...`);
            
            // Try up to 3 times with increasing delays
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                electionCandidateIds = await studentIdWeb3Service.getElectionCandidates(election.blockchainId);
                console.log(`Found ${electionCandidateIds.length} candidates for election ${election.blockchainId} (attempt ${attempt}):`, electionCandidateIds);
                break; // Exit retry loop on success
              } catch (candidateListError) {
                console.error(`Failed to get candidate list for election ${election.blockchainId} (attempt ${attempt}):`, candidateListError);
                if (attempt < 3) {
                  // Exponential backoff: wait 1s, then 2s before retrying
                  const delay = attempt * 1000;
                  console.log(`Retrying candidate list retrieval in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            }
            
            // Check if our candidate is in the list
            registeredForElection = electionCandidateIds.includes(blockchainCandidateId);
            console.log(`Candidate ${candidate.studentId} (blockchain ID ${blockchainCandidateId}) registration status: ${registeredForElection ? 'Registered' : 'Not Registered'}`);
            
            // If not registered but should be, try an alternative check
            if (!registeredForElection) {
              console.log(`Trying alternative verification for candidate ${candidate.studentId}...`);
              try {
                // Try to verify using direct contract call - this is a more direct but more expensive method
                const isRegisteredAlternative = await web3Service.checkCandidateInElection(election.blockchainId, blockchainCandidateId);
                if (isRegisteredAlternative) {
                  console.log(`Alternative verification SUCCESSFUL - candidate ${candidate.studentId} IS registered for election ${election.blockchainId}`);
                  registeredForElection = true;
                } else {
                  console.log(`Alternative verification confirms candidate ${candidate.studentId} is NOT registered for election ${election.blockchainId}`);
                }
              } catch (alternativeCheckError) {
                console.error(`Alternative verification failed:`, alternativeCheckError);
                // Continue with original result since alternative check failed
              }
            }
          } catch (registrationError: any) {
            console.error(`Error checking registration status for candidate ${candidate.studentId}:`, registrationError);
            newCandidateResults[candidate.id] = {
              exists: true,
              blockchainId: blockchainCandidateId,
              studentId: candidate.studentId,
              registeredForElection: false,
              error: registrationError.message || "Failed to check if candidate is registered for election"
            };
            continue;
          }
          
          // Get vote count for candidate if registered - try multiple times with exponential backoff
          let voteCount = 0;
          if (registeredForElection) {
            console.log(`Attempting to get vote count for candidate with blockchain ID ${blockchainCandidateId}`);
            // Try up to 3 times with increasing delays
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                voteCount = await studentIdWeb3Service.getCandidateVoteCount(blockchainCandidateId);
                console.log(`Successfully retrieved vote count (attempt ${attempt}): ${voteCount} for candidate ID ${blockchainCandidateId}`);
                break; // Exit the retry loop on success
              } catch (voteCountError) {
                console.error(`Failed to get vote count for candidate ${blockchainCandidateId} (attempt ${attempt}):`, voteCountError);
                if (attempt < 3) {
                  // Exponential backoff: wait 1s, then 2s before retrying
                  const delay = attempt * 1000;
                  console.log(`Retrying vote count retrieval in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            }
          }
          
          // All checks passed, update the results
          newCandidateResults[candidate.id] = {
            exists: true,
            blockchainId: blockchainCandidateId,
            studentId: candidate.studentId,
            registeredForElection,
            voteCount
          };
          
        } catch (error: any) {
          // Generic error for this candidate
          newCandidateResults[candidate.id] = {
            exists: false,
            studentId: candidate.studentId,
            error: error.message || "Failed to verify candidate"
          };
        }
      }
      
      // Update all candidate results at once
      setCandidatesVerificationResults(newCandidateResults);
      
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify blockchain status",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async () => {
    if (!selectedElectionId) {
      toast({
        title: "No Election Selected",
        description: "Please select an election to verify",
        variant: "destructive",
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Ensure the wallet is connected first - this might be needed for vote count retrieval
      try {
        console.log("Connecting wallet before verification...");
        await studentIdWeb3Service.connectWallet();
      } catch (walletError) {
        console.warn("Failed to connect wallet, but continuing with verification:", walletError);
        // Continue with verification even if wallet fails to connect
      }
      
      const election = elections.find((e: any) => e.id === selectedElectionId);
      if (!election) {
        throw new Error(`Election ${selectedElectionId} not found`);
      }
      
      // Reinitialize both web3 services to ensure fresh connection
      console.log("Reinitializing Web3 services for verification...");
      await Promise.all([
        studentIdWeb3Service.initialize(), 
        web3Service.initialize()
      ]);
      
      await verifyElectionOnBlockchain(election);
      
      toast({
        title: "Verification Complete",
        description: "Blockchain verification has been completed with updated vote counts",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify blockchain status",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchElections(),
        selectedElectionId ? refetchCandidates() : Promise.resolve()
      ]);
      
      toast({
        title: "Data Refreshed",
        description: "Election and candidate data has been refreshed from the database",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh data",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="mr-2 h-5 w-5" />
          Blockchain Verification
        </CardTitle>
        <CardDescription>
          Verify if elections and candidates are properly registered on the blockchain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-80">
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedElectionId || ''}
              onChange={(e) => setSelectedElectionId(e.target.value ? Number(e.target.value) : null)}
              disabled={isVerifying}
            >
              <option value="">Select an election to verify</option>
              {elections.map((election: any) => (
                <option key={election.id} value={election.id}>
                  {election.name} - {election.position} 
                  {election.blockchainId ? ` (ID: ${election.blockchainId})` : ' (Not deployed)'}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleVerify}
              disabled={!selectedElectionId || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify on Blockchain
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isVerifying}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
        
        {isLoadingElections && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading elections...</span>
          </div>
        )}

        {selectedElectionId && (
          <Accordion type="single" collapsible defaultValue="election">
            <AccordionItem value="election">
              <AccordionTrigger>
                <div className="flex items-center">
                  Election Verification
                  {electionVerificationResult && (
                    <Badge variant={electionVerificationResult.exists ? "outline" : "destructive"} className={`ml-2 ${electionVerificationResult.exists ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
                      {electionVerificationResult.exists ? "Verified" : "Not Found"}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {electionVerificationResult ? (
                  <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-md">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Status:</span>
                      {electionVerificationResult.exists ? (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          <Check className="mr-1 h-3 w-3" />
                          Found on Blockchain
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="ml-2">
                          <X className="mr-1 h-3 w-3" />
                          Not Found
                        </Badge>
                      )}
                    </div>
                    
                    {electionVerificationResult.exists ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <p><span className="font-medium">Blockchain ID:</span> {electionVerificationResult.blockchainId}</p>
                            <p><span className="font-medium">Election Type:</span> {electionVerificationResult.type === 1 ? 'President/VP' : 'Senator'}</p>
                            <p>
                              <span className="font-medium">Election State:</span> {
                                electionVerificationResult.state === 0 ? 'Created' :
                                electionVerificationResult.state === 1 ? 'Active' :
                                electionVerificationResult.state === 2 ? 'Completed' : 'Unknown'
                              }
                            </p>
                          </div>
                          <div>
                            <p><span className="font-medium">Start Time:</span> {new Date(electionVerificationResult.startTime! * 1000).toLocaleString()}</p>
                            <p><span className="font-medium">End Time:</span> {new Date(electionVerificationResult.endTime! * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-red-500 mt-2">
                        <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                        {electionVerificationResult.error || "Election not found on blockchain"}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    {isVerifying ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Verifying election...
                      </div>
                    ) : (
                      <p>Click "Verify on Blockchain" to check election status</p>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="candidates">
              <AccordionTrigger>
                <div className="flex items-center">
                  Candidates Verification
                  {Object.keys(candidatesVerificationResults).length > 0 && (
                    <Badge 
                      variant={Object.values(candidatesVerificationResults).every(r => r.exists && r.registeredForElection) 
                        ? "outline" : "destructive"} 
                      className={`ml-2 ${Object.values(candidatesVerificationResults).every(r => r.exists && r.registeredForElection) 
                        ? "bg-green-50 text-green-700 border-green-200" : ""}`}
                    >
                      {Object.values(candidatesVerificationResults).filter(r => r.exists && r.registeredForElection).length} 
                      /{Object.keys(candidatesVerificationResults).length} Verified
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {isLoadingCandidates ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading candidates...</span>
                  </div>
                ) : candidateDetails.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Election Link</TableHead>
                        <TableHead>Blockchain ID</TableHead>
                        <TableHead>Votes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidateDetails.map((candidate: any) => {
                        const result = candidatesVerificationResults[candidate.id];
                        return (
                          <TableRow key={candidate.id}>
                            <TableCell>{candidate.fullName}</TableCell>
                            <TableCell><code>{candidate.studentId}</code></TableCell>
                            <TableCell>
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : result ? (
                                <div className="flex items-center">
                                  {result.exists ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <Check className="mr-1 h-3 w-3" />
                                      Found
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      <X className="mr-1 h-3 w-3" />
                                      Not Found
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not verified</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : result && result.exists ? (
                                <div className="flex items-center">
                                  {result.registeredForElection ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <Check className="mr-1 h-3 w-3" />
                                      Linked
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      <X className="mr-1 h-3 w-3" />
                                      Not Linked
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {result?.blockchainId ? (
                                <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{result.blockchainId}</code>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isVerifying ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : result?.exists && result?.registeredForElection ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {result.voteCount !== undefined ? result.voteCount : '-'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    {selectedElectionId ? "No candidates found for this election" : "Select an election to see candidates"}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          {selectedElectionId ? (
            <>
              <span className="font-medium">Selected Election:</span> {elections.find((e: any) => e.id === selectedElectionId)?.name}
              {" - "}
              <span className="font-medium">Candidates:</span> {candidateDetails.length}
            </>
          ) : (
            "No election selected"
          )}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Use this tool to verify blockchain registration status
        </div>
      </CardFooter>
    </Card>
  );
}