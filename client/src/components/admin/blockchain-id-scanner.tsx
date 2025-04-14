import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStudentIdWeb3 } from "@/hooks/use-student-id-web3";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ElectionSummary {
  id: number;
  name: string | null;
  startTime: Date | null;
  endTime: Date | null;
  isActive: boolean;
  numCandidates?: number;
  numVotes?: number;
}

/**
 * BlockchainIdScanner Component
 * 
 * This component provides administrators with a tool to scan the blockchain for valid election IDs.
 * It attempts to retrieve election details for a range of IDs and displays the results.
 * This helps identify which election IDs exist on the blockchain when there are mismatches with the database.
 */
export function BlockchainIdScanner() {
  const { toast } = useToast();
  const { studentIdWeb3Service } = useStudentIdWeb3();
  const [isScanning, setIsScanning] = useState(false);
  const [electionData, setElectionData] = useState<ElectionSummary[]>([]);
  // Use timestamp values for scanning - typical Unix timestamps for current time
  const [scanRange, setScanRange] = useState({ 
    start: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // One week ago
    end: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // One day ahead
  });
  const [error, setError] = useState<string | null>(null);

  const scanForElections = async () => {
    try {
      setIsScanning(true);
      setError(null);
      setElectionData([]);
      
      const foundElections: ElectionSummary[] = [];
      
      // Scan for elections - using specific timestamps strategy instead of sequential scanning
      // For timestamp-based IDs, sample at 1-day intervals through the range
      const samplingInterval = 24 * 60 * 60; // One day in seconds
      for (let timestamp = scanRange.start; timestamp <= scanRange.end; timestamp += samplingInterval) {
        const id = timestamp;
        try {
          console.log(`Scanning for election ${id}...`);
          const details = await studentIdWeb3Service.getElectionDetails(id);
          
          if (details) {
            foundElections.push({
              id,
              name: null, // Blockchain doesn't store election names
              startTime: details.startTime ? new Date(details.startTime * 1000) : null,
              endTime: details.endTime ? new Date(details.endTime * 1000) : null,
              isActive: details.active || false,
              numCandidates: details.numCandidates,
              numVotes: details.totalVotes
            });
          }
        } catch (err: any) {
          console.error(`Error accessing election ${id} data:`, err);
          // We don't stop scanning on individual failures
        }
      }
      
      setElectionData(foundElections as ElectionSummary[]);
      
      if (foundElections.length === 0) {
        setError(`No valid elections found in ID range ${scanRange.start}-${scanRange.end}`);
      } else {
        toast({
          title: "Blockchain Scan Complete",
          description: `Found ${foundElections.length} elections on the blockchain`,
        });
      }
    } catch (err: any) {
      console.error('Error scanning blockchain:', err);
      setError(err.message || 'Failed to scan blockchain');
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: err.message || "Could not scan blockchain for elections",
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Blockchain ID Scanner
        </CardTitle>
        <CardDescription>
          Scan the blockchain for valid election IDs to help resolve ID mismatches with the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div>
              <label className="text-sm text-muted-foreground">Start Timestamp</label>
              <input
                type="datetime-local"
                value={new Date(scanRange.start * 1000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  const timestamp = Math.floor(date.getTime() / 1000);
                  setScanRange({ ...scanRange, start: timestamp });
                }}
                className="w-full p-2 border rounded-md"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Unix: {scanRange.start}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">End Timestamp</label>
              <input
                type="datetime-local"
                value={new Date(scanRange.end * 1000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  const timestamp = Math.floor(date.getTime() / 1000);
                  setScanRange({ ...scanRange, end: timestamp });
                }}
                className="w-full p-2 border rounded-md"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Unix: {scanRange.end}
              </div>
            </div>
          </div>
          <Button 
            onClick={scanForElections} 
            disabled={isScanning}
            className="mt-4"
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan Blockchain
              </>
            )}
          </Button>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {electionData.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted p-3">
              <h3 className="font-medium">Found Elections on Blockchain</h3>
              <p className="text-sm text-muted-foreground">
                Use these IDs when manually creating or updating elections in the database
              </p>
            </div>
            <div className="divide-y">
              {electionData.map((election) => (
                <div key={election.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="font-mono font-semibold text-lg mr-2" title="Unix Timestamp ID">{election.id}</span>
                      <Badge variant={election.isActive ? "default" : "outline"}>
                        {election.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground mr-2">Start:</span>
                      {election.startTime ? election.startTime.toLocaleString() : "N/A"}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground mr-2">End:</span>
                      {election.endTime ? election.endTime.toLocaleString() : "N/A"}
                    </div>
                    {(election.numCandidates !== undefined || election.numVotes !== undefined) && (
                      <div className="flex space-x-3 mt-1 text-xs">
                        {election.numCandidates !== undefined && (
                          <span className="text-muted-foreground">
                            Candidates: {election.numCandidates}
                          </span>
                        )}
                        {election.numVotes !== undefined && (
                          <span className="text-muted-foreground">
                            Votes: {election.numVotes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}