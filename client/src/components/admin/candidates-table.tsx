import { Candidate } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface CandidatesTableProps {
  candidates: Candidate[];
  onEdit?: (candidateId: number) => void;
  onDelete?: (candidateId: number) => void;
}

export function CandidatesTable({ candidates, onEdit, onDelete }: CandidatesTableProps) {
  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center bg-white">
        <p className="text-gray-500">No candidates found.</p>
      </div>
    );
  }

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'withdrawn':
        return <Badge className="bg-red-100 text-red-800">Withdrawn</Badge>;
      case 'disqualified':
        return <Badge className="bg-gray-100 text-gray-800">Disqualified</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-12">ID</TableHead>
            <TableHead className="w-36">Picture</TableHead>
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
                {candidate.pictureUrl ? (
                  <img 
                    src={candidate.pictureUrl} 
                    alt={candidate.fullName} 
                    className="w-20 h-20 rounded-md object-cover" 
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=80&h=80";
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                    <span className="text-gray-500 text-xs">No Image</span>
                  </div>
                )}
              </TableCell>
              <TableCell>{candidate.fullName}</TableCell>
              <TableCell>{candidate.studentId}</TableCell>
              <TableCell>{candidate.faculty}</TableCell>
              <TableCell>{candidate.position}</TableCell>
              <TableCell>{renderStatusBadge(candidate.status)}</TableCell>
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
                    <DropdownMenuItem 
                      onClick={() => onDelete && onDelete(candidate.id)}
                      className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
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