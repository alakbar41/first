import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  User, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Define ticket status badge component
function TicketStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "open":
      return <Badge variant="secondary">Open</Badge>;
    case "in_progress":
      return <Badge variant="default">In Progress</Badge>;
    case "resolved":
      return <Badge variant="outline">Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Define ticket type badge component
function TicketTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "concern":
      return <Badge variant="destructive">Concern</Badge>;
    case "suggestion":
      return <Badge variant="default">Suggestion</Badge>;
    case "other":
      return <Badge variant="outline">Other</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

export default function AdminTicketsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTicket, setActiveTicket] = React.useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("open");

  // Get all tickets
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["/api/tickets"],
    refetchOnWindowFocus: false,
  });

  // Update ticket status mutation
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tickets/${id}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update ticket status");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      if (activeTicket && activeTicket.id === data.id) {
        setActiveTicket(data);
      }
      toast({
        title: "Status Updated",
        description: `Ticket status has been updated to ${data.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Filter tickets based on active tab
  const filteredTickets = React.useMemo(() => {
    if (activeTab === "all") return tickets;
    return tickets.filter((ticket: any) => ticket.status === activeTab);
  }, [tickets, activeTab]);

  // Handle ticket click
  const handleTicketClick = (ticket: any) => {
    setActiveTicket(ticket);
    setIsDetailsDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = (status: string) => {
    if (activeTicket) {
      updateTicketStatusMutation.mutate({ id: activeTicket.id, status });
    }
  };

  // Get counts for tabs
  const counts = React.useMemo(() => {
    const open = tickets.filter((t: any) => t.status === "open").length;
    const inProgress = tickets.filter((t: any) => t.status === "in_progress").length;
    const resolved = tickets.filter((t: any) => t.status === "resolved").length;
    return { open, inProgress, resolved, all: tickets.length };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white pb-10 relative">
      {/* Full-width background gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-r from-purple-700 to-purple-500 z-0"></div>
      
      <div className="container py-6 relative z-10">
        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-bold text-white">
            Support Ticket Management
          </h1>
          <p className="text-white/80 mt-2">
            Review and respond to student concerns, suggestions, and feedback
          </p>
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="border-b bg-white rounded-t-lg shadow-sm">
            <TabsList className="w-full justify-start rounded-none h-12 bg-transparent border-b-0 mb-[-1px]">
              <TabsTrigger 
                value="open" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-700 data-[state=active]:bg-transparent data-[state=active]:text-purple-900 h-12"
              >
                <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                Open 
                <Badge className="ml-2 bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                  {counts.open}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="in_progress"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-700 data-[state=active]:bg-transparent data-[state=active]:text-purple-900 h-12"
              >
                <Clock className="h-4 w-4 mr-2 text-amber-500" />
                In Progress 
                <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                  {counts.inProgress}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="resolved"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-700 data-[state=active]:bg-transparent data-[state=active]:text-purple-900 h-12"
              >
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                Resolved 
                <Badge className="ml-2 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                  {counts.resolved}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-700 data-[state=active]:bg-transparent data-[state=active]:text-purple-900 h-12"
              >
                <MessageSquare className="h-4 w-4 mr-2 text-purple-500" />
                All Tickets 
                <Badge className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                  {counts.all}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value={activeTab} className="mt-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-3" />
                  <p className="text-muted-foreground">Loading tickets...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-100">
                  <div className="bg-red-100 p-3 rounded-full mb-3">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium mb-1">Failed to load tickets</p>
                  <p className="text-red-500 text-sm">Please try refreshing the page</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    {activeTab === "open" && <AlertCircle className="h-8 w-8 text-gray-400" />}
                    {activeTab === "in_progress" && <Clock className="h-8 w-8 text-gray-400" />}
                    {activeTab === "resolved" && <CheckCircle className="h-8 w-8 text-gray-400" />}
                    {activeTab === "all" && <HelpCircle className="h-8 w-8 text-gray-400" />}
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800">No {activeTab !== "all" ? activeTab : ""} tickets found</h3>
                    <p className="text-muted-foreground">
                      {activeTab === "open" && "There are no open tickets requiring attention."}
                      {activeTab === "in_progress" && "There are no tickets currently being processed."}
                      {activeTab === "resolved" && "There are no resolved tickets at this time."}
                      {activeTab === "all" && "There are no tickets in the system."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredTickets.map((ticket: any) => (
                    <Card
                      key={ticket.id} 
                      className="overflow-hidden transition-all duration-200 hover:shadow-sm border-gray-200 hover:border-purple-300 cursor-pointer"
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <CardHeader className="pb-2 pt-4 bg-gradient-to-r from-purple-50/70 to-white">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                              <span>{ticket.title}</span>
                              <span className="text-sm text-muted-foreground font-normal font-mono">#{ticket.id}</span>
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                <span>User ID: {ticket.userId}</span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 6v6l4 2"></path>
                                </svg>
                                {formatDate(ticket.createdAt)}
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <TicketTypeBadge type={ticket.type} />
                            {ticket.status === "open" && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Open</Badge>
                            )}
                            {ticket.status === "in_progress" && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
                            )}
                            {ticket.status === "resolved" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3">
                        <p className="text-sm line-clamp-2 text-gray-600">{ticket.description}</p>
                      </CardContent>
                      <CardFooter className="bg-gray-50 py-2 px-4 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MoreHorizontal className="h-3 w-3" />
                          <span>Click to manage ticket</span>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Ticket Details Dialog */}
        {activeTicket && (
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
              <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b bg-gradient-to-r from-purple-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100">
                    <MessageSquare className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl text-gray-800">
                      Ticket <span className="font-mono text-sm text-gray-500">#{activeTicket.id}</span>
                    </DialogTitle>
                    <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>User {activeTicket.userId}</span>
                      </div>
                      <span>•</span>
                      {activeTicket.type === "concern" && (
                        <Badge variant="destructive" className="py-0">Concern</Badge>
                      )}
                      {activeTicket.type === "suggestion" && (
                        <Badge variant="default" className="bg-blue-500 py-0">Suggestion</Badge>
                      )}
                      {activeTicket.type === "other" && (
                        <Badge variant="outline" className="py-0">Other</Badge>
                      )}
                    </DialogDescription>
                  </div>
                </div>
                
                {activeTicket.status === "open" && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" /> Open
                  </Badge>
                )}
                {activeTicket.status === "in_progress" && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="h-3 w-3 mr-1" /> In Progress
                  </Badge>
                )}
                {activeTicket.status === "resolved" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                  </Badge>
                )}
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{activeTicket.title}</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">{activeTicket.description}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                      </svg>
                      <span className="text-gray-600">Submitted: <span className="font-medium text-gray-700">{formatDate(activeTicket.createdAt)}</span></span>
                    </div>
                    {activeTicket.updatedAt && activeTicket.updatedAt !== activeTicket.createdAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500">
                          <path d="M23 12a11 11 0 1 1-22 0 11 11 0 0 1 22 0Z"></path>
                          <path d="m13 8-5 5 5 5"></path>
                          <path d="M17 12H9"></path>
                        </svg>
                        <span className="text-gray-600">Last updated: <span className="font-medium text-gray-700">{formatDate(activeTicket.updatedAt)}</span></span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Update Status:</span>
                      <Select
                        defaultValue={activeTicket.status}
                        onValueChange={handleStatusChange}
                        disabled={updateTicketStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[180px] border-gray-200">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open" className="flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            <span>Open</span>
                          </SelectItem>
                          <SelectItem value="in_progress" className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            <span>In Progress</span>
                          </SelectItem>
                          <SelectItem value="resolved" className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            <span>Resolved</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      {updateTicketStatusMutation.isPending && (
                        <div className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      )}
                      <Button 
                        onClick={() => setIsDetailsDialogOpen(false)}
                        variant="outline"
                        className="border-gray-200"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}