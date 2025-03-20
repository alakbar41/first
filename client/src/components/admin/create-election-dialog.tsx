import { FormEvent, useState } from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
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

interface CreateElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateElectionDialog({ open, onOpenChange }: CreateElectionDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [eligibility, setEligibility] = useState("all");
  const [electionType, setElectionType] = useState("");

  const eligibilityOptions = [
    { id: "all", label: "All Students" },
    { id: "SITE", label: "SITE Students" },
    { id: "SPA", label: "SPA Students" },
    { id: "SB", label: "SB Students" },
    { id: "SESD", label: "SESD Students" },
  ];

  const createElectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/elections", {
        name: data.name,
        position: data.position,
        description: `Election for ${data.position} position`,
        startDate: data.startDate,
        endDate: data.endDate,
        eligibleFaculties: data.eligibility === "all" 
          ? ["SITE", "SPA", "SB", "SESD"]
          : [data.eligibility],
        status: "upcoming",
        createdBy: user?.id || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Election created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setPosition("");
    setStartDate(undefined);
    setEndDate(undefined);
    setEligibility("all");
    setElectionType("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!name || !position || !startDate || !endDate || !eligibility) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    createElectionMutation.mutate({
      name,
      position,
      startDate,
      endDate,
      eligibility,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-purple-100 border-0 rounded-xl max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-purple-900 mb-4">Add New Election</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium text-purple-800">Election Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="President Election"
              className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
            />
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="type" className="text-sm font-medium text-purple-800">Election Type</Label>
            <Select value={electionType} onValueChange={setElectionType}>
              <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                <SelectValue placeholder="Presidency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presidency">Presidency</SelectItem>
                <SelectItem value="senate">Senate</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="class">Class Representative</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="startDate" className="text-sm font-medium text-purple-800">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="endDate" className="text-sm font-medium text-purple-800">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="eligibility" className="text-sm font-medium text-purple-800">Eligibility</Label>
            <Select value={eligibility} onValueChange={setEligibility}>
              <SelectTrigger className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                {eligibilityOptions.map(option => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
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
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}