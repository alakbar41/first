import { Election } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Clock, Users } from "lucide-react";
import { getFacultyName } from "@shared/schema";

interface ElectionCardProps {
  election: Election;
  onClick: (electionId: number) => void;
  isSelected: boolean;
}

export function ElectionCard({ election, onClick, isSelected }: ElectionCardProps) {
  // Helper function to format dates
  function formatDate(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status badge for election
  const getStatusBadge = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return <Badge className="absolute top-3 right-3 bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="absolute top-3 right-3 bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
    } else {
      return <Badge className="absolute top-3 right-3 bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
  };

  // Get status for election
  const getElectionStatus = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return "upcoming";
    } else if (now > endDate) {
      return "completed";
    } else {
      return "active";
    }
  };

  // Get card style based on status and selection
  const getCardStyle = () => {
    const status = getElectionStatus();
    
    let baseStyle = "cursor-pointer transform transition-all duration-200 hover:scale-105 relative overflow-hidden ";
    
    if (isSelected) {
      return baseStyle + "ring-2 ring-purple-500 shadow-lg";
    }
    
    return baseStyle + "shadow-sm";
  };

  return (
    <Card 
      className={getCardStyle()}
      onClick={() => onClick(election.id)}
    >
      {/* Purple header with election name and position */}
      <div className="bg-purple-600 text-white p-6 relative">
        <h3 className="text-xl font-bold">{election.name}</h3>
        <p className="mt-1 opacity-90">{election.position}</p>
        {getStatusBadge()}
      </div>
      
      <CardContent className="p-6 grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Eligible Faculties</p>
            <p className="text-sm font-medium">
              {election.eligibleFaculties.includes("all") 
                ? "All Faculties" 
                : election.eligibleFaculties.map(f => getFacultyName(f)).join(", ")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Start Date</p>
            <p className="text-sm font-medium">{formatDate(election.startDate)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">End Date</p>
            <p className="text-sm font-medium">{formatDate(election.endDate)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}