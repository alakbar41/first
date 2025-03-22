import { Candidate, getFacultyName } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UserCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface CandidatesTableProps {
  candidates: Candidate[];
  onEdit?: (candidateId: number) => void;
  onDelete?: (candidateId: number) => void;
}

export function CandidatesTable({ candidates, onEdit, onDelete }: CandidatesTableProps) {
  const [candidatesInElections, setCandidatesInElections] = useState<{[id: number]: boolean}>({});
  const [loadingElectionStatus, setLoadingElectionStatus] = useState<{[id: number]: boolean}>({});
  const [electionTooltips, setElectionTooltips] = useState<{[id: number]: string}>({});
  
  // Check if candidates are in elections
  useEffect(() => {
    // Create a map to track if we already have status info for a candidate
    // to prevent unnecessary API calls
    const checkedCandidates = new Map<number, boolean>();
    
    const checkCandidatesInElections = async () => {
      const results: {[id: number]: boolean} = {};
      const tooltips: {[id: number]: string} = {};
      
      // Reset loading states for all candidates
      const loadingStates: {[id: number]: boolean} = {};
      candidates.forEach(candidate => {
        loadingStates[candidate.id] = true;
      });
      setLoadingElectionStatus(loadingStates);
      
      for (const candidate of candidates) {
        try {
          // Skip inactive candidates - they're definitely not in elections
          if (candidate.status === "inactive") {
            results[candidate.id] = false;
            loadingStates[candidate.id] = false;
            continue;
          }
          
          const res = await apiRequest("GET", `/api/candidates/${candidate.id}/in-elections`);
          const data = await res.json();
          
          results[candidate.id] = data.inElections;
          
          if (data.inElections && data.elections && data.elections.length > 0) {
            const electionNames = data.elections.map((e: any) => e.name).join(", ");
            tooltips[candidate.id] = `In elections: ${electionNames}`;
          }
          
          // If candidate status is active but not in elections, this is inconsistent
          // It likely means an election was just deleted
          if (candidate.status === "active" && !data.inElections) {
            console.log(`Candidate ${candidate.id} has active status but is not in any elections`);
          }
        } catch (error) {
          console.error(`Error checking election status for candidate ${candidate.id}:`, error);
        } finally {
          loadingStates[candidate.id] = false;
        }
      }
      
      setLoadingElectionStatus(loadingStates);
      setCandidatesInElections(results);
      setElectionTooltips(tooltips);
    };
    
    checkCandidatesInElections();
  }, [candidates]);

  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-md border">
        <p className="text-gray-500">No candidates found.</p>
      </div>
    );
  }

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status: string, isInElection: boolean) => {
    if (isInElection) {
      return <Badge className="bg-green-500 text-white hover:bg-green-600">Active (In Election)</Badge>;
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500 text-white hover:bg-gray-600">Inactive</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">{status}</Badge>;
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">ID</TableHead>
            <TableHead className="w-20">Photo</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Student ID</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id} className="border-b border-gray-200">
              <TableCell className="font-medium">{candidate.id}</TableCell>
              <TableCell>
                {candidate.pictureUrl && candidate.pictureUrl !== "" ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={candidate.pictureUrl} 
                      alt={candidate.fullName} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserCircle className="text-gray-400 w-8 h-8" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{candidate.fullName}</TableCell>
              <TableCell>{candidate.studentId}</TableCell>
              <TableCell>{getFacultyName(candidate.faculty)}</TableCell>
              <TableCell>{candidate.position}</TableCell>
              <TableCell>
                {loadingElectionStatus[candidate.id] ? (
                  <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
                    <span className="animate-pulse">Checking status...</span>
                  </Badge>
                ) : (
                  renderStatusBadge(candidate.status, candidatesInElections[candidate.id] || false)
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <span className="sr-only">Open menu</span>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                        <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onEdit && onEdit(candidate.id)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {loadingElectionStatus[candidate.id] ? (
                      <div className="flex items-center px-2 py-1.5 text-gray-400 cursor-wait">
                        <span className="animate-pulse">Checking...</span>
                      </div>
                    ) : candidatesInElections[candidate.id] ? (
                      <div className="flex items-center px-2 py-1.5 text-gray-400 cursor-not-allowed">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        <span>Delete (In Election)</span>
                      </div>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => onDelete && onDelete(candidate.id)}
                        className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}