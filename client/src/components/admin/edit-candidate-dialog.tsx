import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FACULTY_CODES, CANDIDATE_POSITIONS, InsertCandidate, Candidate, getFacultyName } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserRound } from "lucide-react";

// Form schema with validation
const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  studentId: z.string().min(1, "Student ID is required"),
  faculty: z.enum(FACULTY_CODES as unknown as [string, ...string[]]),
  position: z.enum(CANDIDATE_POSITIONS as unknown as [string, ...string[]]),
  pictureUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: Candidate;
}

export function EditCandidateDialog({ open, onOpenChange, candidate }: EditCandidateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      studentId: "",
      faculty: "SITE" as any,
      position: "President" as any,
      pictureUrl: "",
    },
  });

  // Set form values when candidate changes
  useEffect(() => {
    if (candidate) {
      form.reset({
        fullName: candidate.fullName,
        studentId: candidate.studentId,
        faculty: candidate.faculty as any,
        position: candidate.position as any,
        pictureUrl: candidate.pictureUrl || "",
      });
      
      if (candidate.pictureUrl) {
        setPicturePreview(candidate.pictureUrl);
      } else {
        setPicturePreview(null);
      }
    }
  }, [candidate, form]);

  const updateCandidateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!candidate) return null;
      const res = await apiRequest("PATCH", `/api/candidates/${candidate.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      form.setValue("pictureUrl", data.url);
      setPicturePreview(data.url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (data: FormValues) => {
    updateCandidateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
          <DialogDescription>
            Update candidate information in the system.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-4">
              <Avatar className="h-24 w-24 mb-2">
                {picturePreview ? (
                  <AvatarImage src={picturePreview} alt="Preview" />
                ) : (
                  <AvatarFallback>
                    <UserRound className="h-12 w-12" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col items-center">
                <label htmlFor="picture" className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                  {uploading ? "Uploading..." : "Change Picture"}
                </label>
                <input
                  id="picture"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Student ID */}
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter student ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Faculty */}
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
                      {FACULTY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {getFacultyName(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CANDIDATE_POSITIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={updateCandidateMutation.isPending || uploading}
              >
                {updateCandidateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}