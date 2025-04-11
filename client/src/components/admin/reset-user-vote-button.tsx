import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ResetUserVoteButtonProps {
  electionId: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;
  size?: "default" | "sm" | "lg" | "icon" | null | undefined;
  className?: string;
}

export function ResetUserVoteButton({
  electionId,
  variant = "outline",
  size = "sm",
  className = "",
}: ResetUserVoteButtonProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (isResetting) return;
    
    try {
      setIsResetting(true);
      
      const response = await apiRequest('POST', '/api/test/reset-user-vote', {
        electionId
      });
      
      if (response.ok) {
        toast({
          title: "Vote reset successful",
          description: "The user can now vote again in this election.",
          duration: 3000,
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset vote");
      }
    } catch (error: any) {
      console.error('Failed to reset vote:', error);
      toast({
        title: "Reset failed",
        description: `Error: ${error.message || "Unknown error"}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleReset}
      disabled={isResetting}
    >
      {isResetting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Resetting...
        </>
      ) : (
        "Reset My Vote"
      )}
    </Button>
  );
}