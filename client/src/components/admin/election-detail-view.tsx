import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Election, getFacultyName } from "@shared/schema";
import { User, CalendarIcon, Clock, Users, ServerIcon } from "lucide-react";
import { format } from "date-fns";
import { DeployToBlockchainButton } from "./deploy-to-blockchain-button";

interface ElectionDetailViewProps {
  election: Election;
  className?: string;
}

export function AdminElectionDetailView({ election, className = "" }: ElectionDetailViewProps) {
  const [blockchainId, setBlockchainId] = useState<number | null>(election.blockchainId || null);
  
  // Helper function to format dates
  function formatDate(dateString: string | Date) {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, "MMM d, yyyy - HH:mm");
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

  // Handle successful deployment to blockchain
  const handleDeploySuccess = async (id: number) => {
    setBlockchainId(id);
    
    // Update the election in the database with the blockchain ID
    try {
      console.log(`Updating election ${election.id} with blockchain ID ${id}`);
      const response = await fetch(`/api/elections/${election.id}/blockchain-id`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockchainId: id }),
      });
      
      if (!response.ok) {
        console.error('Failed to update election with blockchain ID');
      }
    } catch (error) {
      console.error('Error updating election with blockchain ID:', error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Election Details Card */}
      <Card className="overflow-hidden shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white">{election.name}</CardTitle>
              <p className="text-purple-100 mt-1">{election.position}</p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Eligible Faculties</p>
                <p className="text-sm font-medium">
                  {election.position === "President/Vice President" 
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
          </div>
          
          {election.description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-sm text-gray-700 mt-1">{election.description}</p>
            </div>
          )}
          
          {/* Blockchain Deployment Section */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ServerIcon className="h-5 w-5 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-700">Blockchain Deployment</h3>
              </div>
              
              {blockchainId && (
                <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                  Blockchain ID: {blockchainId}
                </Badge>
              )}
            </div>
            
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-3">
                Deploy this election to the blockchain to enable secure, immutable voting. Elections must be deployed before students can vote.
              </p>
              
              <DeployToBlockchainButton 
                election={election}
                onSuccess={handleDeploySuccess}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}