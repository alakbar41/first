import { format } from "date-fns";
import { MoreHorizontal, Edit, Trash, UserPlus, Users, ServerIcon } from "lucide-react";
import { Election, getFacultyName } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ElectionsTableProps {
  elections: Election[];
  onEdit?: (electionId: number) => void;
  onDelete?: (electionId: number) => void;
  onAddCandidates?: (election: Election) => void;
  onViewCandidates?: (election: Election) => void;
  onViewDetails?: (election: Election) => void;
}

export function ElectionsTable({ elections, onEdit, onDelete, onAddCandidates, onViewCandidates, onViewDetails }: ElectionsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Election Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Position Contested
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Eligibility
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Start & End Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {elections.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                <p className="font-medium mb-2">No elections found</p>
                <p>Create your first election to get started</p>
              </td>
            </tr>
          ) : (
            elections.map((election) => (
              <tr key={election.id} className="hover:bg-gray-50">
                {/* Election Name */}
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{election.name}</span>
                  </div>
                </td>
                
                {/* Position Contested */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span>{election.position}</span>
                </td>
                
                {/* Eligibility */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {election.position === "President/Vice President" ? (
                      <Badge 
                        variant="secondary" 
                        className="bg-purple-50 text-purple-800 border border-purple-100"
                      >
                        All Students
                      </Badge>
                    ) : (
                      election.eligibleFaculties.map((faculty) => (
                        <Badge 
                          key={faculty} 
                          variant="secondary" 
                          className="bg-purple-50 text-purple-800 border border-purple-100"
                        >
                          {getFacultyName(faculty)}
                        </Badge>
                      ))
                    )}
                  </div>
                </td>
                
                {/* Start & End Date */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-col space-y-1">
                    <div>
                      <span className="font-medium">Start:</span> {format(new Date(election.startDate), "MMM d, yyyy - HH:mm")}
                    </div>
                    <div>
                      <span className="font-medium">End:</span> {format(new Date(election.endDate), "MMM d, yyyy - HH:mm")}
                    </div>
                  </div>
                </td>
                
                {/* Status */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  <Badge className={getStatusColor(election.status)}>
                    {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                  </Badge>
                </td>

                <td className="px-6 py-4 text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => onAddCandidates && onAddCandidates(election)}
                        className="cursor-pointer"
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        <span>Add Candidates</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onViewCandidates && onViewCandidates(election)}
                        className="cursor-pointer"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        <span>View Candidates</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* View details item */}
                      <DropdownMenuItem 
                        onClick={() => onViewDetails && onViewDetails(election)}
                        className="cursor-pointer"
                      >
                        <ServerIcon className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onEdit && onEdit(election.id)}
                        className="cursor-pointer"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete && onDelete(election.id)}
                        className="text-red-600 cursor-pointer focus:text-red-700"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}