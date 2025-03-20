import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LogOut, Plus, Edit, Trash, ArrowUpDown, Search, Filter } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Election } from "@shared/schema";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import CreateElectionForm from "@/components/admin/create-election-form";

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isCreateElectionOpen, setIsCreateElectionOpen] = useState(false);

  // Fetch elections
  const { data: elections, isLoading } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => {
      const response = await fetch("/api/elections");
      if (!response.ok) throw new Error("Failed to fetch elections");
      return response.json();
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user?.isAdmin) {
    navigate("/");
    return null;
  }

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="/images/adalogo.svg" 
              alt="ADA University Logo" 
              className="h-10"
            />
            <h1 className="text-white font-heading font-bold text-xl hidden md:block">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-sm hidden sm:block">
              {user?.email}
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="bg-[#004A80] hover:bg-[#2D4A70] text-white"
            >
              {logoutMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging out...
                </span>
              ) : (
                <span className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow container mx-auto px-4 py-8 bg-[#F8F9FA]">
        <Tabs defaultValue="elections" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="elections">Elections</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="elections" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Elections Management</h2>
              <Dialog open={isCreateElectionOpen} onOpenChange={setIsCreateElectionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Election
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Election</DialogTitle>
                    <DialogDescription>
                      Fill in the details for the new election.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateElectionForm 
                    onSuccess={() => setIsCreateElectionOpen(false)}
                    onCancel={() => setIsCreateElectionOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search elections..."
                  className="pl-10 bg-white"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {isLoading ? (
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="h-24 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </CardContent>
                </Card>
              ) : elections && elections.length > 0 ? (
                elections.map((election) => (
                  <Card key={election.id} className="bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-bold mb-1">{election.name}</CardTitle>
                          <p className="text-sm text-gray-500">Position: {election.position}</p>
                        </div>
                        <Badge className={getStatusColor(election.status)}>
                          {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{election.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Start Date:</p>
                          <p className="font-medium">{format(new Date(election.startDate), 'PP')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">End Date:</p>
                          <p className="font-medium">{format(new Date(election.endDate), 'PP')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Eligible Faculties:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {election.eligibleFaculties.map((faculty) => (
                              <Badge key={faculty} variant="secondary" className="bg-gray-100 text-gray-800">
                                {faculty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 pt-2">
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No elections found</p>
                      <Button
                        onClick={() => setIsCreateElectionOpen(true)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Election
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="students">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-4">Student Management</h3>
                <p className="text-gray-500">This feature will be implemented in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-4">Reports</h3>
                <p className="text-gray-500">This feature will be implemented in a future update.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-[#E9ECEF] border-t border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-[#6C757D] text-sm">
            &copy; {new Date().getFullYear()} ADA University Voting System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}