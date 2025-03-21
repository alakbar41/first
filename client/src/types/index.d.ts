// Declaration for component files
declare module '@/components/admin/create-candidate-dialog' {
  export interface CreateCandidateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }
  
  export function CreateCandidateDialog(props: CreateCandidateDialogProps): JSX.Element;
}

declare module '@/components/admin/candidates-table' {
  import { Candidate } from "@shared/schema";
  
  export interface CandidatesTableProps {
    candidates: Candidate[];
    onEdit?: (candidateId: number) => void;
    onDelete?: (candidateId: number) => void;
  }
  
  export function CandidatesTable(props: CandidatesTableProps): JSX.Element;
}