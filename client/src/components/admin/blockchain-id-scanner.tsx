import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStudentIdWeb3 } from "@/hooks/use-student-id-web3";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateWithTime } from "@/lib/utils"; 
import { Loader2 } from "lucide-react";

interface ElectionSummary {
  id: number;
  electionType: number;
  status: number;
  startTime: number;
  endTime: number;
  totalVotesCast: number;
  resultsFinalized: boolean;
  startDate: string;
  endDate: string;
}

export function BlockchainIdScanner() {
  const { toast } = useToast();
  const { studentIdWeb3Service } = useStudentIdWeb3();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ElectionSummary[]>([]);
  const [maxId, setMaxId] = useState(20);

  const handleScan = async () => {
    if (!studentIdWeb3Service) {
      toast({
        title: "Error",
        description: "Blockchain service not initialized",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanResults([]);

    try {
      toast({
        title: "Scanning blockchain",
        description: `Scanning for election IDs from 0 to ${maxId}...`,
      });

      // Run the scan
      const validElections = await studentIdWeb3Service.scanForValidElectionIds(maxId);
      
      // Convert Map to array for easier display
      const results = Array.from(validElections.values());
      setScanResults(results);

      toast({
        title: "Scan Complete",
        description: `Found ${results.length} valid elections on the blockchain.`,
      });
    } catch (error: any) {
      console.error("Scan failed:", error);
      toast({
        title: "Scan Failed",
        description: error.message || "Error scanning blockchain",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Format election type
  const getElectionTypeText = (type: number) => {
    switch (type) {
      case 0:
        return "Senator";
      case 1:
        return "President/VP";
      default:
        return `Unknown (${type})`;
    }
  };

  // Format election status
  const getElectionStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Pending";
      case 1:
        return "Active";
      case 2:
        return "Completed";
      case 3:
        return "Cancelled";
      default:
        return `Unknown (${status})`;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Blockchain Election ID Scanner</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 items-center">
            <label htmlFor="maxId" className="text-sm">
              Max ID to scan:
            </label>
            <input
              id="maxId"
              type="number"
              value={maxId}
              onChange={(e) => setMaxId(Number(e.target.value))}
              className="w-20 p-2 border rounded"
              min="1"
              max="100"
            />
            <Button onClick={handleScan} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Scan Blockchain"
              )}
            </Button>
          </div>

          {scanResults.length > 0 ? (
            <div className="mt-4 border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Votes</TableHead>
                    <TableHead className="text-right">Finalized</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanResults.map((election) => (
                    <TableRow key={election.id}>
                      <TableCell className="font-medium">{election.id}</TableCell>
                      <TableCell>{getElectionTypeText(election.electionType)}</TableCell>
                      <TableCell>{getElectionStatusText(election.status)}</TableCell>
                      <TableCell>
                        {formatDateWithTime(new Date(election.startTime * 1000))}
                      </TableCell>
                      <TableCell>
                        {formatDateWithTime(new Date(election.endTime * 1000))}
                      </TableCell>
                      <TableCell className="text-right">
                        {election.totalVotesCast}
                      </TableCell>
                      <TableCell className="text-right">
                        {election.resultsFinalized ? "Yes" : "No"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : isScanning ? (
            <p className="text-center py-4">Scanning blockchain...</p>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              Click "Scan Blockchain" to find all valid election IDs on the blockchain
            </p>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <p>This tool scans the blockchain for valid election IDs to help debug ID mismatches.</p>
            <p>It can help identify which blockchain election IDs are valid to use for voting.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}