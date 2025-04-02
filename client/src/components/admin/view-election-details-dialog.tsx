import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Election } from "@shared/schema";
import { AdminElectionDetailView } from "./election-detail-view";

interface ViewElectionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election?: Election;
}

export function ViewElectionDetailsDialog({
  open,
  onOpenChange,
  election,
}: ViewElectionDetailsDialogProps) {
  if (!election) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Election Details</DialogTitle>
        </DialogHeader>
        
        <AdminElectionDetailView election={election} />
      </DialogContent>
    </Dialog>
  );
}