import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Election, FACULTY_CODES, FACULTY_ABBREVIATIONS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(1, "Election name is required"),
  position: z.string().min(1, "Position is required"),
  faculty: z.string().optional(),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

export function EditElectionDialog({ open, onOpenChange, election }: EditElectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      position: "President/Vice President",
      faculty: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  // State to track if election is already deployed to blockchain
  const [isDeployedToBlockchain, setIsDeployedToBlockchain] = useState(false);
  
  // Set form values when election changes and check blockchain deployment status
  useEffect(() => {
    if (election) {
      const eligibleFaculty = election.eligibleFaculties && election.eligibleFaculties.length > 0 
        ? election.eligibleFaculties[0] 
        : "";
      
      // Check if election is deployed to blockchain
      setIsDeployedToBlockchain(!!election.blockchainId);
      
      form.reset({
        name: election.name,
        position: election.position,
        faculty: eligibleFaculty,
        description: election.description || "",
        startDate: new Date(election.startDate),
        endDate: new Date(election.endDate),
      });
    }
  }, [election, form]);

  const updateElectionMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!election) return null;
      
      // Format data for API
      const now = new Date();
      let status = "upcoming";
      
      // Calculate status based on dates
      if (data.startDate <= now && data.endDate >= now) {
        status = "active";
      } else if (data.endDate < now) {
        status = "completed";
      }
      
      const apiData = {
        ...data,
        status,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        // For Senator elections, use the faculty as an array. For others, use an empty array
        eligibleFaculties: data.position === "Senator" && data.faculty ? [data.faculty] : [],
      };
      
      // Remove faculty property since it's handled via eligibleFaculties
      delete (apiData as any).faculty;
      
      const res = await apiRequest("PATCH", `/api/elections/${election.id}`, apiData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Election updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: FormValues) => {
    // Block editing if already deployed to blockchain
    if (isDeployedToBlockchain) {
      toast({
        title: "Cannot Edit Deployed Election",
        description: "This election has already been deployed to the blockchain and cannot be modified.",
        variant: "destructive",
      });
      onOpenChange(false); // Close the dialog
      return;
    }
    
    // Validate dates
    if (data.endDate < data.startDate) {
      toast({
        title: "Invalid Dates",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    
    // Check if start date has changed - clear blockchain ID if it has
    // This ensures the start date can be used as a stable identifier
    const oldStartDate = election ? new Date(election.startDate) : null;
    const newStartDate = data.startDate;
    
    // Prepare data for submission
    const submissionData = {...data};
    
    // If start date changed, we need to clear any existing blockchain ID
    // since it would invalidate our mapping
    if (oldStartDate && newStartDate && 
        oldStartDate.getTime() !== newStartDate.getTime()) {
      console.log('Start date changed - this will clear any blockchain ID mapping');
    }
    
    updateElectionMutation.mutate(submissionData);
  };

  // Handle position change
  const handlePositionChange = (position: string) => {
    form.setValue("position", position);
    
    // Clear the faculty/eligibility field when switching to President/VP
    if (position === "President/Vice President") {
      form.setValue("faculty", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Election</DialogTitle>
          <DialogDescription>
            Update election information in the system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Election Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Election Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter election name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Position */}
            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select 
                    onValueChange={handlePositionChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="President/Vice President">
                        President/Vice President
                      </SelectItem>
                      <SelectItem value="Senator">
                        Senator
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Eligibility Field */}
            <FormField
              control={form.control}
              name="faculty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eligibility</FormLabel>
                  
                  {form.watch("position") === "President/Vice President" ? (
                    <div className="border rounded-md px-3 py-2 bg-purple-50 text-purple-800 border-purple-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">All Students</span>
                        <span className="text-xs bg-purple-100 px-2 py-0.5 rounded">Default for President/VP Elections</span>
                      </div>
                    </div>
                  ) : (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select eligibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FACULTY_CODES.map(code => (
                          <SelectItem key={code} value={code}>
                            {FACULTY_ABBREVIATIONS[code]} Students ({code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal w-full"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Keep the time from the existing date value
                                const updatedDate = new Date(date);
                                if (field.value) {
                                  updatedDate.setHours(
                                    field.value.getHours(),
                                    field.value.getMinutes()
                                  );
                                }
                                field.onChange(updatedDate);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <FormControl>
                        <Input
                          type="time"
                          className="w-[140px]"
                          value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : '00:00'}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(field.value || new Date());
                            newDate.setHours(hours, minutes);
                            field.onChange(newDate);
                          }}
                        />
                      </FormControl>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className="pl-3 text-left font-normal w-full"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Keep the time from the existing date value
                                const updatedDate = new Date(date);
                                if (field.value) {
                                  updatedDate.setHours(
                                    field.value.getHours(),
                                    field.value.getMinutes()
                                  );
                                }
                                field.onChange(updatedDate);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <FormControl>
                        <Input
                          type="time"
                          className="w-[140px]"
                          value={field.value ? `${String(field.value.getHours()).padStart(2, '0')}:${String(field.value.getMinutes()).padStart(2, '0')}` : '00:00'}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(field.value || new Date());
                            newDate.setHours(hours, minutes);
                            field.onChange(newDate);
                          }}
                        />
                      </FormControl>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status and blockchain warning messages */}
            <div className="rounded-md border p-4 bg-blue-50">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Election status is automatically managed based on start and end dates.
              </p>
            </div>
            
            {/* Blockchain warning for deployed elections */}
            {isDeployedToBlockchain && (
              <div className="rounded-md border p-4 bg-amber-50">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-600 mt-0.5 mr-2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">This election has been deployed to the blockchain</p>
                    <p className="mt-1">Once deployed to the blockchain, elections cannot be modified to maintain data integrity between systems. To make changes, you must delete this election and create a new one.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                type="button"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateElectionMutation.isPending || isDeployedToBlockchain}
              >
                {updateElectionMutation.isPending 
                  ? "Saving..." 
                  : isDeployedToBlockchain 
                    ? "Cannot Edit Deployed Election" 
                    : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}