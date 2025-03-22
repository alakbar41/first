import { FormEvent, useState, useEffect } from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FACULTY_CODES, getFacultyName } from "@shared/schema";

interface CreateElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateElectionDialog({ open, onOpenChange }: CreateElectionDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [eligibility, setEligibility] = useState("all");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("18");
  const [endMinute, setEndMinute] = useState("00");
  
  // Derived values
  const finalStartDate = startDate ? 
    new Date(
      startDate.getFullYear(), 
      startDate.getMonth(), 
      startDate.getDate(), 
      parseInt(startHour), 
      parseInt(startMinute)
    ) : undefined;
    
  const finalEndDate = endDate ? 
    new Date(
      endDate.getFullYear(), 
      endDate.getMonth(), 
      endDate.getDate(), 
      parseInt(endHour), 
      parseInt(endMinute)
    ) : undefined;
  
  // Reset form function
  const resetForm = () => {
    setName("");
    setPosition("");
    setStartDate(undefined);
    setEndDate(undefined);
    setEligibility("all");
    setStartHour("09");
    setStartMinute("00");
    setEndHour("18");
    setEndMinute("00");
  };
  
  // Position options
  const positionOptions = [
    { id: "president_vp", label: "President/Vice President" },
    { id: "senator", label: "Senator" },
  ];

  // Generate eligibility options from faculty codes
  const eligibilityOptions = [
    { id: "all", label: "All Students" },
    ...FACULTY_CODES.map(code => ({ 
      id: code, 
      label: `${getFacultyName(code)} Students` 
    })),
  ];

  const hourOptions = Array.from({length: 24}, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: hour, label: hour };
  });

  const minuteOptions = Array.from({length: 12}, (_, i) => {
    const minute = (i * 5).toString().padStart(2, '0');
    return { value: minute, label: minute };
  });

  // Update eligibility when position changes
  useEffect(() => {
    if (position === "president_vp") {
      setEligibility("all");
    }
  }, [position]);

  // Create election mutation
  const createElectionMutation = useMutation({
    mutationFn: async (data: any) => {
      // Debug the data before sending
      console.log("Submitting election data:", data);
      
      // Ensure dates are properly formatted as ISO strings
      const startDateIso = data.startDate.toISOString();
      const endDateIso = data.endDate.toISOString();
      
      const payload = {
        name: data.name,
        position: data.position === "president_vp" ? "President/Vice President" : "Senator",
        description: `Election for ${data.position === "president_vp" ? "President/Vice President" : "Senator"} position`,
        startDate: startDateIso,
        endDate: endDateIso,
        // For Senator elections, use the faculty as an array. For others, use an empty array
        eligibleFaculties: data.position === "president_vp" ? [] : [data.eligibility],
        status: "upcoming", // Default status for new elections
        createdBy: user?.id || 1 // Use current admin user ID if available
      };
      
      const response = await apiRequest("POST", "/api/elections", payload);
      
      if (!response.ok) {
        // Try to parse error message
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to create election");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate elections cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      
      // Close dialog and reset form
      resetForm();
      onOpenChange(false);
      
      // Notify user
      toast({
        title: "Election created",
        description: "The election has been created successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating election:", error);
      
      // Notify user
      toast({
        title: "Failed to create election",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name || !position || !finalStartDate || !finalEndDate) {
      toast({
        title: "Invalid form",
        description: "Please fill out all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate dates
    if (finalEndDate <= finalStartDate) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare data for mutation
    const data = {
      name,
      position,
      startDate: finalStartDate,
      endDate: finalEndDate,
      eligibility,
      createdBy: user?.id,
    };
    
    // Submit data
    createElectionMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] overflow-y-auto max-h-[85vh] bg-purple-50">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-purple-800">Create New Election</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Election Name */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium text-purple-800">Election Name*</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fall 2025 Presidential Election"
              className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
              required
            />
          </div>
          
          {/* Position Contested */}
          <div className="space-y-3">
            <Label htmlFor="position" className="text-sm font-medium text-purple-800">Position Contested*</Label>
            <Select value={position} onValueChange={setPosition} required>
              <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positionOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Eligibility */}
          <div className="space-y-3">
            <Label htmlFor="eligibility" className="text-sm font-medium text-purple-800">Eligibility*</Label>
            
            {position === "president_vp" ? (
              <div className="border rounded-md px-3 py-2 bg-purple-50 text-purple-800 border-purple-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">All Students</span>
                  <span className="text-xs bg-purple-100 px-2 py-0.5 rounded">Default for President/VP Elections</span>
                </div>
              </div>
            ) : (
              <Select 
                value={eligibility} 
                onValueChange={setEligibility} 
                required
              >
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <SelectValue placeholder="Select eligibility" />
                </SelectTrigger>
                <SelectContent>
                  {eligibilityOptions.filter(option => 
                    position !== "senator" || option.id !== "all"
                  ).map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Start Date and Time */}
          <div className="space-y-3">
            <Label htmlFor="startDate" className="text-sm font-medium text-purple-800">Start Date & Time*</Label>
            <div className="grid grid-cols-3 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="startDate"
                    variant="outline"
                    className={cn(
                      "col-span-1 justify-start text-left font-normal bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMM dd, yyyy") : <span>Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    disabled={(date) => date < new Date()} // Prevent selecting dates in the past
                  />
                </PopoverContent>
              </Popover>
              
              <Select value={startHour} onValueChange={setStartHour}>
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hourOptions.map(hour => (
                    <SelectItem key={hour.value} value={hour.value}>{hour.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={startMinute} onValueChange={setStartMinute}>
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map(minute => (
                    <SelectItem key={minute.value} value={minute.value}>{minute.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* End Date and Time */}
          <div className="space-y-3">
            <Label htmlFor="endDate" className="text-sm font-medium text-purple-800">End Date & Time*</Label>
            <div className="grid grid-cols-3 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="endDate"
                    variant="outline"
                    className={cn(
                      "col-span-1 justify-start text-left font-normal bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : <span>Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              <Select value={endHour} onValueChange={setEndHour}>
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Hour" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hourOptions.map(hour => (
                    <SelectItem key={hour.value} value={hour.value}>{hour.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={endMinute} onValueChange={setEndMinute}>
                <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map(minute => (
                    <SelectItem key={minute.value} value={minute.value}>{minute.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Status Note */}
          <div className="bg-white p-3 rounded-md border border-purple-200">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Status:</span> New elections will be created with an "Upcoming" status. The status will automatically change to "Active" when the start date is reached and to "Completed" after the end date.
            </p>
          </div>
          
          {/* Form Actions */}
          <DialogFooter className="flex space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="flex-1 bg-white border-purple-200 text-purple-800 hover:bg-purple-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-purple-700 hover:bg-purple-800"
              disabled={createElectionMutation.isPending}
            >
              {createElectionMutation.isPending ? "Creating..." : "Create Election"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}