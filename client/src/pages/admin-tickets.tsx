import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, AlertCircle, MessageSquare, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// Ticket type badge component
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

// Format date
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

export default function AdminTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = React.useState<any>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("all");

  // Get all tickets
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["/api/tickets"],
    refetchOnWindowFocus: false,
  });

  // Update ticket status mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tickets/${id}/status`, { status });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setIsResponseDialogOpen(false);
      toast({
        title: "Ticket Updated",
        description: "The ticket status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle ticket resolution
  const handleResolveTicket = () => {
    updateTicketMutation.mutate({
      id: selectedTicket.id,
      status: "resolved",
    });
  };

  // Filter tickets based on status
  const filteredTickets = React.useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    
    if (filter === "all") return tickets;
    return tickets.filter((ticket: any) => ticket.status === filter);
  }, [tickets, filter]);

  // Count tickets by status
  const ticketCounts = React.useMemo(() => {
    if (!Array.isArray(tickets)) return { open: 0, in_progress: 0, resolved: 0, all: 0 };
    
    return tickets.reduce(
      (counts: any, ticket: any) => {
        counts[ticket.status] = (counts[ticket.status] || 0) + 1;
        counts.all += 1;
        return counts;
      },
      { open: 0, in_progress: 0, resolved: 0, all: 0 }
    );
  }, [tickets]);

  return (
    <div className="flex min-h-screen h-full bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar user={user} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-12">
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50 to-white">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-500 pb-6">
            <div className="container px-6 pt-6 pb-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Support Tickets
                  </h1>
                  <p className="text-white/80 mt-2">
                    Manage and respond to student tickets
                  </p>
                </div>
                <div className="flex gap-2">
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="bg-white w-[180px] border-0 shadow-sm">
                      <SelectValue placeholder="Filter tickets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          All Tickets ({ticketCounts.all})
                        </span>
                      </SelectItem>
                      <SelectItem value="open">
                        <span className="flex items-center">
                          <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
                          New ({ticketCounts.open})
                        </span>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 text-amber-500" />
                          In Progress ({ticketCounts.in_progress})
                        </span>
                      </SelectItem>
                      <SelectItem value="resolved">
                        <span className="flex items-center">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Resolved ({ticketCounts.resolved})
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets section */}
          <div className="container px-6 py-8 -mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-100">
                  <div className="bg-red-100 p-3 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-red-600">
                      <path d="M12 9v4"></path>
                      <path d="M12 17h.01"></path>
                      <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                  </div>
                  <p className="text-red-600 font-medium mb-1">Failed to load tickets</p>
                  <p className="text-red-500 text-sm">Please try refreshing the page</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-purple-100 p-4 rounded-full mb-4">
                    <MessageSquare className="h-10 w-10 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                  <p className="text-gray-500 max-w-md">
                    {filter === "all"
                      ? "There are no support tickets in the system yet."
                      : `There are no ${filter.replace("_", " ")} tickets at the moment.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="mb-4 border-b border-gray-200">
                    <div className="flex flex-wrap -mb-px">
                      <button
                        className={`mr-2 inline-block py-2 px-4 text-sm font-medium ${
                          filter === "all" 
                            ? "text-purple-600 border-b-2 border-purple-600" 
                            : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
                        }`}
                        onClick={() => setFilter("all")}
                      >
                        All ({ticketCounts.all})
                      </button>
                      <button
                        className={`mr-2 inline-block py-2 px-4 text-sm font-medium ${
                          filter === "open" 
                            ? "text-red-600 border-b-2 border-red-600" 
                            : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
                        }`}
                        onClick={() => setFilter("open")}
                      >
                        New ({ticketCounts.open})
                      </button>
                      <button
                        className={`mr-2 inline-block py-2 px-4 text-sm font-medium ${
                          filter === "in_progress" 
                            ? "text-amber-600 border-b-2 border-amber-600" 
                            : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
                        }`}
                        onClick={() => setFilter("in_progress")}
                      >
                        In Progress ({ticketCounts.in_progress})
                      </button>
                      <button
                        className={`mr-2 inline-block py-2 px-4 text-sm font-medium ${
                          filter === "resolved" 
                            ? "text-green-600 border-b-2 border-green-600" 
                            : "text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent"
                        }`}
                        onClick={() => setFilter("resolved")}
                      >
                        Resolved ({ticketCounts.resolved})
                      </button>
                    </div>
                  </div>
                
                  <div className="mt-6">
                    {filteredTickets.map((ticket: any) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onMarkInProgress={() => {
                          updateTicketMutation.mutate({
                            id: ticket.id,
                            status: "in_progress",
                          });
                        }}
                        onResolve={() => {
                          setSelectedTicket(ticket);
                          setIsResponseDialogOpen(true);
                        }}
                        isPending={updateTicketMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Resolve Confirmation Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this ticket as resolved?
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
              <p className="font-medium text-sm mb-1">{selectedTicket.title}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{selectedTicket.description}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResponseDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveTicket}
              disabled={updateTicketMutation.isPending}
              className="bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600"
            >
              {updateTicketMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                "Resolve Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ticket Card Component
interface TicketCardProps {
  ticket: any;
  onMarkInProgress: () => void;
  onResolve: () => void;
  isPending: boolean;
}

function TicketCard({ ticket, onMarkInProgress, onResolve, isPending }: TicketCardProps) {
  return (
    <Card className="shadow-sm mb-4 border-gray-200 overflow-hidden">
      <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-purple-50/70 to-white">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <span>{ticket.title}</span>
              <span className="text-sm text-muted-foreground font-normal font-mono">#{ticket.id}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                {formatDate(ticket.createdAt)}
              </span>
              <span>•</span>
              <span>User: {ticket.userId}</span>
              <span>•</span>
              <TicketTypeBadge type={ticket.type} />
            </div>
          </div>
          {ticket.status === "open" && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">New</Badge>
          )}
          {ticket.status === "in_progress" && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">In Progress</Badge>
          )}
          {ticket.status === "resolved" && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="py-4">
        <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{ticket.description}</p>
      </CardContent>
      
      <CardFooter className="bg-gray-50 py-3 px-6 border-t border-gray-100 justify-end space-x-2">
        {ticket.status === "open" && (
          <>
            <Button 
              variant="outline" 
              onClick={onMarkInProgress}
              disabled={isPending}
              className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark In Progress"}
            </Button>
            <Button 
              onClick={onResolve}
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}
            </Button>
          </>
        )}
        {ticket.status === "in_progress" && (
          <Button 
            onClick={onResolve}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}
          </Button>
        )}
        {ticket.status === "resolved" && (
          <p className="text-sm text-green-700 flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Resolved on {formatDate(ticket.updatedAt)}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}