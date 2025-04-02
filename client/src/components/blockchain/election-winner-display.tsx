import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getElectionWinner } from '@/lib/improved-blockchain-integration';
import { Award, Loader2 } from "lucide-react";

interface ElectionWinnerDisplayProps {
  electionId: number;
  electionType: 'Senator' | 'PresidentVP';
  getCandidateName: (id: number) => Promise<string | undefined>;
  className?: string;
}

export function ElectionWinnerDisplay({ 
  electionId,
  electionType,
  getCandidateName,
  className = ""
}: ElectionWinnerDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ winnerId: number, votes: number, name?: string } | null>(null);
  
  useEffect(() => {
    const fetchWinner = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get winner data from the blockchain
        const winnerData = await getElectionWinner(electionId);
        
        // Get candidate name from database
        let winnerName;
        try {
          winnerName = await getCandidateName(winnerData.winnerId);
        } catch (nameError) {
          console.error("Failed to fetch candidate name:", nameError);
          // Continue without the name
        }
        
        setWinner({
          ...winnerData,
          name: winnerName
        });
      } catch (err: any) {
        console.error("Failed to fetch election winner:", err);
        setError(err.message || "Failed to fetch election winner. The results may not be finalized yet.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchWinner();
  }, [electionId, electionType, getCandidateName]);
  
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-yellow-500" />
            Election Winner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5 text-yellow-500" />
            Election Winner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="mr-2 h-5 w-5 text-yellow-500" />
          Election Winner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {winner ? (
          <div className="space-y-2">
            <div className="flex items-center">
              <span className="font-bold">Winner ID:</span>
              <span className="ml-2">{winner.winnerId}</span>
            </div>
            
            {winner.name && (
              <div className="flex items-center">
                <span className="font-bold">Name:</span>
                <span className="ml-2">{winner.name}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <span className="font-bold">Votes Received:</span>
              <span className="ml-2">{winner.votes}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No winner information available
          </div>
        )}
      </CardContent>
    </Card>
  );
}