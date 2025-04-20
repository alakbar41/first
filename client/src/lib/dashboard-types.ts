// Type definitions for dashboard data
export type FacultyParticipation = {
  faculty: string;
  total_students: number;
  voted_students: number;
  participation_percentage: number;
  faculty_name?: string;
};

export type VoteTimeline = {
  hour: string;
  vote_count: number;
};

export type BlockchainTransaction = {
  total_transactions: number;
  successful_transactions: number;
};

export type Election = {
  id: number;
  name: string;
  position: string;
  status: string;
  is_on_blockchain: boolean;
  blockchain_id: string | null;
};

export type Candidate = {
  id: number;
  full_name: string; 
  student_id: string;
  faculty: string;
  vote_count: number;
  faculty_name?: string;
};

export type ActiveElection = {
  id: number;
  name: string;
  position: string;
  blockchain_id: string | null;
  vote_count: number;
  total_eligible_voters: number;
  candidates?: Candidate[];
  status?: string; // Add status field
};

export type BlockchainStats = {
  total_elections: number;
  blockchain_elections: number;
  transaction_stats: BlockchainTransaction;
  elections: Election[];
};

export type ParticipationOverview = {
  id: number;
  name: string;
  position: string;
  status: string;
  voters: number;
  total_eligible_voters: number;
  participation_percentage: number;
};