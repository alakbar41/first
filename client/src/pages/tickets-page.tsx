import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2 } from "lucide-react";

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

// Form schema
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  type: z.enum(["concern", "suggestion", "other"])
});

export default function TicketsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateTicketDialogOpen, setIsCreateTicketDialogOpen] = React.useState(false);
  const { user } = useAuth();
  
  // Get user tickets
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ["/api/my-tickets"],
    refetchOnWindowFocus: false,
  });
  
  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "concern",
    },
  });
  
  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/tickets", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tickets"] });
      setIsCreateTicketDialogOpen(false);
      form.reset();
      toast({
        title: "Ticket Created",
        description: "Your ticket has been successfully submitted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submit
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTicketMutation.mutate(data);
  };
  
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar user={user} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
                    Submit and track your concerns, suggestions, or other feedback
                  </p>
                </div>
                <Button 
                  onClick={() => setIsCreateTicketDialogOpen(true)}
                  className="bg-white hover:bg-gray-50 text-purple-700 shadow-md hover:shadow-lg transition-all duration-200 px-5 border border-purple-100"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Create New Ticket
                </Button>
              </div>
            </div>
          </div>

          {/* Create Ticket Dialog */}
          <Dialog open={isCreateTicketDialogOpen} onOpenChange={setIsCreateTicketDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Submit a ticket to share your concerns, suggestions, or feedback with administrators.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of your feedback" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide details about your feedback" 
                            className="h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Type</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="concern" id="concern" />
                              <Label htmlFor="concern">Concern</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="suggestion" id="suggestion" />
                              <Label htmlFor="suggestion">Suggestion</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="other" id="other" />
                              <Label htmlFor="other">Other</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateTicketDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createTicketMutation.isPending}
                      className="bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600"
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Ticket"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Content section with tickets */}
          <div className="container px-6 py-8 -mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-3" />
                  <p className="text-muted-foreground">Loading your tickets...</p>
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
              ) : tickets && tickets.length > 0 ? (
                <div className="space-y-6">
                  {tickets.map((ticket: any) => (
                    <Card key={ticket.id} className="overflow-hidden transition-all duration-200 hover:shadow-sm border-gray-200 hover:border-purple-200">
                      <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-purple-50/70 to-white">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-gray-800">
                              <span>{ticket.title}</span>
                              <span className="text-sm text-muted-foreground font-normal font-mono">#{ticket.id}</span>
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2">
                              <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <path d="M12 6v6l4 2"></path>
                                </svg>
                                {formatDate(ticket.createdAt)}
                              </span>
                              <span>•</span>
                              <TicketTypeBadge type={ticket.type} />
                            </CardDescription>
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
                      {ticket.status !== "open" && (
                        <CardFooter className="bg-gray-50 py-3 px-6 border-t border-gray-100">
                          <div className="w-full flex justify-between items-center">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                                <path d="m9 12 2 2 4-4"></path>
                              </svg>
                              Updated: {formatDate(ticket.updatedAt)}
                            </p>
                            {ticket.status === "in_progress" && (
                              <span className="text-xs text-amber-700">Staff is working on this</span>
                            )}
                            {ticket.status === "resolved" && (
                              <span className="text-xs text-green-700">Issue resolved</span>
                            )}
                          </div>
                        </CardFooter>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-10 w-10 text-purple-600" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800">No tickets yet</h3>
                    <p className="text-muted-foreground">
                      You haven't submitted any support tickets. Need help or have a suggestion for improving the voting platform?
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsCreateTicketDialogOpen(true)}
                    variant="default"
                    className="bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-800 hover:to-purple-600 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Create Your First Ticket
                  </Button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}