import { Election } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CalendarIcon, Clock, Users, Info, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ElectionCardProps {
  election: Election;
  onClick: (electionId: number) => void;
  isSelected: boolean;
}

export function ElectionCard({ election, onClick, isSelected }: ElectionCardProps) {
  // Helper function to format dates
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', { 
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
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
    }
  };

  // Get card style based on status and selection
  const getCardStyle = () => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);
    
    let baseStyle = "cursor-pointer transform transition-all duration-200 hover:scale-105 ";
    
    if (isSelected) {
      return baseStyle + "ring-2 ring-purple-500 shadow-lg";
    }
    
    if (now < startDate) {
      return baseStyle + "border-blue-200";
    } else if (now > endDate) {
      return baseStyle + "border-gray-200 opacity-75";
    } else {
      return baseStyle + "border-green-200";
    }
  };

  return (
    <Card 
      className={getCardStyle()}
      onClick={() => onClick(election.id)}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <h3 className="text-md font-medium">{election.name}</h3>
        {getStatusBadge()}
      </CardHeader>
      
      <CardContent className="p-4 pt-2">
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-gray-500" />
            <span>{election.position}</span>
          </div>
          
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
            <span>Starts: {formatDate(election.startDate)}</span>
          </div>
          
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            <span>Ends: {formatDate(election.endDate)}</span>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full mt-2 bg-gradient-to-r from-purple-700 to-purple-600 text-white hover:from-purple-800 hover:to-purple-700"
            onClick={(e) => {
              e.stopPropagation();
              onClick(election.id);
            }}
          >
            View Candidates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}