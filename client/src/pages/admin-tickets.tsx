import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User } from "lucide-react";
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
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Support Tickets</h1>
        <p className="text-muted-foreground">
          Review and respond to student concerns, suggestions, and feedback
        </p>
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="open">
            Open <Badge variant="outline" className="ml-2">{counts.open}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress <Badge variant="outline" className="ml-2">{counts.inProgress}</Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved <Badge variant="outline" className="ml-2">{counts.resolved}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            All <Badge variant="outline" className="ml-2">{counts.all}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-destructive">Failed to load tickets. Please try again.</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-muted-foreground">No tickets found in this category.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTickets.map((ticket: any) => (
                <div 
                  key={ticket.id} 
                  className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => handleTicketClick(ticket)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{ticket.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>User ID: {ticket.userId}</span>
                        <span>•</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TicketTypeBadge type={ticket.type} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm line-clamp-2">{ticket.description}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Details Dialog */}
      {activeTicket && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>Ticket #{activeTicket.id}</span>
                <TicketStatusBadge status={activeTicket.status} />
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span>Submitted by User ID: {activeTicket.userId}</span>
                <span>•</span>
                <span>{formatDate(activeTicket.createdAt)}</span>
                <span>•</span>
                <TicketTypeBadge type={activeTicket.type} />
              </DialogDescription>
            </DialogHeader>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>{activeTicket.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{activeTicket.description}</p>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Update Status:</span>
                <Select
                  defaultValue={activeTicket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateTicketStatusMutation.isPending}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => setIsDetailsDialogOpen(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}