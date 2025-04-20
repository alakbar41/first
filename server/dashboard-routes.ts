import { Request, Response, Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { isAdmin } from './routes';
import { getFacultyName } from '../shared/constants';
import { type QueryResult } from '@neondatabase/serverless';

// Type definitions for our dashboard data
type FacultyParticipation = {
  faculty: string;
  total_students: number;
  voted_students: number;
  participation_percentage: number;
  faculty_name?: string;
};

type VoteTimeline = {
  hour: string;
  vote_count: number;
};

type BlockchainTransaction = {
  total_transactions: number;
  successful_transactions: number;
};

type Election = {
  id: number;
  name: string;
  position: string;
  status: string;
  is_on_blockchain: boolean;
  blockchain_id: string | null;
};

type Candidate = {
  id: number;
  full_name: string; 
  student_id: string;
  faculty: string;
  vote_count: number;
  faculty_name?: string;
};

type ActiveElection = {
  id: number;
  name: string;
  position: string;
  blockchain_id: string | null;
  vote_count: number;
  total_eligible_voters: number;
  candidates?: Candidate[];
};

type BlockchainStats = {
  total_elections: number;
  blockchain_elections: number;
  transaction_stats: BlockchainTransaction;
  elections: Election[];
};

type ParticipationOverview = {
  id: number;
  name: string;
  position: string;
  status: string;
  voters: number;
  total_eligible_voters: number;
  participation_percentage: number;
};

const router = Router();

// Faculty participation metrics
router.get('/metrics/faculty-participation', isAdmin, async (req: Request, res: Response) => {
  try {
    const electionId = req.query.electionId ? parseInt(req.query.electionId as string) : null;

    let query = sql`
      WITH faculty_counts AS (
        SELECT 
          u.faculty, 
          COUNT(*) as total_students
        FROM users u
        WHERE u.role = 'student'
        GROUP BY u.faculty
      ),
      voted_counts AS (
        SELECT 
          u.faculty, 
          COUNT(DISTINCT v.user_id) as voted_students
        FROM votes v
        JOIN users u ON v.user_id = u.id
        ${electionId ? sql`WHERE v.election_id = ${electionId}` : sql``}
        GROUP BY u.faculty
      )
      SELECT 
        fc.faculty,
        fc.total_students,
        COALESCE(vc.voted_students, 0) as voted_students,
        CASE 
          WHEN fc.total_students > 0 THEN 
            ROUND((COALESCE(vc.voted_students, 0)::float / fc.total_students::float) * 100, 2)
          ELSE 0
        END as participation_percentage
      FROM faculty_counts fc
      LEFT JOIN voted_counts vc ON fc.faculty = vc.faculty
      ORDER BY fc.faculty
    `;

    const facultyParticipation = await db.execute(query) as unknown as FacultyParticipation[];
    
    // Add faculty names for display purposes
    const result = facultyParticipation.map(row => ({
      ...row,
      faculty_name: getFacultyName(row.faculty)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching faculty participation metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Time series voting data
router.get('/metrics/voting-timeline', isAdmin, async (req: Request, res: Response) => {
  try {
    const electionId = req.query.electionId ? parseInt(req.query.electionId as string) : null;
    
    let query = sql`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as vote_count
      FROM votes
      ${electionId ? sql`WHERE election_id = ${electionId}` : sql``}
      GROUP BY hour
      ORDER BY hour
    `;

    const voteTimeline = await db.execute(query) as unknown as VoteTimeline[];
    
    res.json(voteTimeline);
  } catch (error) {
    console.error('Error fetching voting timeline metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Blockchain metrics
router.get('/metrics/blockchain-status', isAdmin, async (req: Request, res: Response) => {
  try {
    // Get elections with blockchain status
    const query = sql`
      SELECT 
        id,
        name,
        position,
        status,
        CASE WHEN blockchain_id IS NOT NULL THEN true ELSE false END as is_on_blockchain,
        blockchain_id
      FROM elections
      ORDER BY created_at DESC
    `;

    const elections = await db.execute(query) as unknown as Election[];
    
    // Get blockchain vote transaction success rate
    const blockchainTransactionsQuery = sql`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_transactions
      FROM blockchain_transactions
    `;

    const transactionStats = await db.execute(blockchainTransactionsQuery) as unknown as BlockchainTransaction[];
    
    const stats: BlockchainStats = {
      total_elections: elections.length,
      blockchain_elections: elections.filter(e => e.is_on_blockchain).length,
      transaction_stats: transactionStats[0] || { total_transactions: 0, successful_transactions: 0 },
      elections: elections
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching blockchain metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Active election stats
router.get('/metrics/active-elections', isAdmin, async (req: Request, res: Response) => {
  try {
    // Get currently active elections
    const activeElectionsQuery = sql`
      SELECT 
        e.id,
        e.name,
        e.position,
        e.blockchain_id,
        COUNT(DISTINCT v.user_id) as vote_count,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_eligible_voters
      FROM elections e
      LEFT JOIN votes v ON e.id = v.election_id
      WHERE e.status = 'active'
      GROUP BY e.id, e.name, e.position, e.blockchain_id
      ORDER BY e.created_at DESC
    `;

    const activeElections = await db.execute(activeElectionsQuery) as unknown as ActiveElection[];
    
    // Get candidate vote counts for each active election
    const result: (ActiveElection & { candidates: Candidate[] })[] = [];
    
    for (const election of activeElections) {
      const candidateVotesQuery = sql`
        SELECT 
          c.id,
          c.full_name,
          c.student_id,
          c.faculty,
          COUNT(v.id) as vote_count
        FROM candidates c
        JOIN election_candidates ec ON c.id = ec.candidate_id
        LEFT JOIN votes v ON v.candidate_id = c.id AND v.election_id = ${election.id}
        WHERE ec.election_id = ${election.id}
        GROUP BY c.id, c.full_name, c.student_id, c.faculty
        ORDER BY vote_count DESC
      `;
      
      const candidates = await db.execute(candidateVotesQuery) as unknown as Candidate[];
      
      result.push({
        ...election,
        candidates: candidates.map(c => ({
          ...c,
          faculty_name: getFacultyName(c.faculty)
        }))
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching active election stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Overall participation stats
router.get('/metrics/participation-overview', isAdmin, async (req: Request, res: Response) => {
  try {
    const query = sql`
      WITH election_stats AS (
        SELECT 
          e.id,
          e.name,
          e.position,
          e.status,
          COUNT(DISTINCT v.user_id) as voters,
          (SELECT COUNT(*) FROM users WHERE role = 'student') as total_eligible_voters
        FROM elections e
        LEFT JOIN votes v ON e.id = v.election_id
        GROUP BY e.id, e.name, e.position, e.status
      )
      SELECT 
        id,
        name,
        position,
        status,
        voters,
        total_eligible_voters,
        CASE 
          WHEN total_eligible_voters > 0 THEN 
            ROUND((voters::float / total_eligible_voters::float) * 100, 2)
          ELSE 0
        END as participation_percentage
      FROM election_stats
      ORDER BY id DESC
    `;

    const participationStats = await db.execute(query) as unknown as ParticipationOverview[];
    
    res.json(participationStats);
  } catch (error) {
    console.error('Error fetching participation overview metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Ticket metrics
router.get('/metrics/tickets', isAdmin, async (req: Request, res: Response) => {
  try {
    const query = sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM tickets
      GROUP BY status
    `;

    const ticketCounts = await db.execute(query) as unknown as Array<{status: string, count: string}>;
    
    // Transform results into a more convenient format
    const result = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      total: 0
    };
    
    // With drizzle-orm, the result should be an array
    if (Array.isArray(ticketCounts)) {
      ticketCounts.forEach(row => {
        if (row.status in result) {
          result[row.status as keyof typeof result] = parseInt(row.count);
        }
        result.total += parseInt(row.count);
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching ticket metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export function registerDashboardRoutes(app: any) {
  app.use('/api/dashboard', router);
}