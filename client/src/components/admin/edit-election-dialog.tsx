import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Election } from "@shared/schema";
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
  const [showFaculty, setShowFaculty] = useState(false);

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

  // Set form values when election changes
  useEffect(() => {
    if (election) {
      const eligibleFaculty = election.eligibleFaculties && election.eligibleFaculties.length > 0 
        ? election.eligibleFaculties[0] 
        : "";
        
      form.reset({
        name: election.name,
        position: election.position,
        faculty: eligibleFaculty,
        description: election.description || "",
        startDate: new Date(election.startDate),
        endDate: new Date(election.endDate),
      });
      
      // Show/hide faculty field based on position
      setShowFaculty(election.position === "Senator");
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
    // Validate dates
    if (data.endDate < data.startDate) {
      toast({
        title: "Invalid Dates",
        description: "End date cannot be before start date",
        variant: "destructive",
      });
      return;
    }
    
    updateElectionMutation.mutate(data);
  };

  // Handle position change to show/hide faculty field
  const handlePositionChange = (position: string) => {
    form.setValue("position", position);
    
    if (position === "Senator") {
      setShowFaculty(true);
    } else {
      setShowFaculty(false);
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

            {/* Faculty (only for Senator position) */}
            {showFaculty && (
              <FormField
                control={form.control}
                name="faculty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faculty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="School of IT and Engineering">School of IT and Engineering</SelectItem>
                        <SelectItem value="School of Business">School of Business</SelectItem>
                        <SelectItem value="School of Public and International Affairs">School of Public and International Affairs</SelectItem>
                        <SelectItem value="School of Education">School of Education</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="pl-3 text-left font-normal"
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
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className="pl-3 text-left font-normal"
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
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status info message */}
            <div className="rounded-md border p-4 bg-blue-50">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Election status is automatically managed based on start and end dates.
              </p>
            </div>

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
                disabled={updateElectionMutation.isPending}
              >
                {updateElectionMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}