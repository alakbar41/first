import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ResetUserVoteButtonProps {
  electionId: number;
  className?: string;
  onResetSuccess?: () => void;
}

/**
 * A simplified replacement for the original ResetUserVoteButton component.
 * This component shows a button that indicates the reset feature is disabled.
 */
export function ResetUserVoteButton({ 
  electionId, 
  className = "",
  onResetSuccess
}: ResetUserVoteButtonProps) {
  const { toast } = useToast();
  
  return (
    <Button 
      onClick={() => {
        toast({
          title: "Reset Vote",
          description: "The vote reset feature has been disabled in this version.",
          variant: "default",
        });
      }}
      className={`${className} bg-gray-500 hover:bg-gray-600`}
    >
      Reset Vote
    </Button>
  );
}