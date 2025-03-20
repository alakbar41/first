import { format } from "date-fns";
import { MoreHorizontal, Edit, Trash } from "lucide-react";
import { Election } from "@shared/schema";
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
}

export function ElectionsTable({ elections, onEdit, onDelete }: ElectionsTableProps) {
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
              Election
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date Range
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Eligibility
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
              <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                <p className="font-medium mb-2">No elections found</p>
                <p>Create your first election to get started</p>
              </td>
            </tr>
          ) : (
            elections.map((election) => (
              <tr key={election.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{election.name}</span>
                    <span className="text-xs text-gray-500">{election.position}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-col space-y-1">
                    <span>Start: {format(new Date(election.startDate), "MMM d, yyyy")}</span>
                    <span>End: {format(new Date(election.endDate), "MMM d, yyyy")}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {election.eligibleFaculties.map((faculty) => (
                      <Badge 
                        key={faculty} 
                        variant="secondary" 
                        className="bg-purple-50 text-purple-800 border border-purple-100"
                      >
                        {faculty}
                      </Badge>
                    ))}
                  </div>
                </td>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onEdit && onEdit(election.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete && onDelete(election.id)}
                        className="text-red-600 focus:text-red-700"
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