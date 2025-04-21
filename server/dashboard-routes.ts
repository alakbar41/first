import { Request, Response, Router } from 'express';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { isAdmin } from './routes';
import { getFacultyName } from '../shared/constants';
import { getElectionResults, checkElectionExists } from './blockchain';
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
    // Just get faculty distribution from the database since this doesn't involve votes
    // We'll use blockchain data for the actual voting information elsewhere
    let query = sql`
      SELECT 
        u.faculty, 
        COUNT(*) as total_students,
        0 as voted_students,
        0 as participation_percentage
      FROM users u
      WHERE u.is_admin = false
        AND u.faculty NOT IN ('Administration') -- Exclude admin faculties
      GROUP BY u.faculty
      ORDER BY u.faculty
    `;

    const queryResult = await db.execute(query);
    console.log('Faculty distribution query result:', JSON.stringify(queryResult, null, 2));
    
    // Ensure we have an array to work with
    const facultyDistribution = Array.isArray(queryResult) 
      ? queryResult 
      : queryResult && typeof queryResult === 'object' && 'rows' in queryResult 
        ? queryResult.rows || []
        : [];
    
    console.log('Faculty array to map:', JSON.stringify(facultyDistribution, null, 2));
    
    // Add faculty names for display purposes
    const result = facultyDistribution.map(row => ({
      ...row,
      faculty_name: getFacultyName(row.faculty)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching faculty distribution metrics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Completed elections data for dashboard with blockchain results
router.get('/metrics/completed-elections', isAdmin, async (req: Request, res: Response) => {
  try {
    // Get completed elections - we'll get vote counts directly from blockchain
    const completedElectionsQuery = sql`
      SELECT 
        e.id,
        e.name,
        e.position,
        e.blockchain_id,
        0 as vote_count,
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND faculty NOT IN ('Administration')) as total_eligible_voters
      FROM 
        elections e
      WHERE 
        e.status = 'completed'
      ORDER BY 
        e.id DESC
    `;

    // Raw query for debugging
    console.log('Completed elections query:', completedElectionsQuery.toString());
    
    // Execute query
    const completedElectionsResult = await db.execute(completedElectionsQuery);
    console.log('Completed elections raw result:', JSON.stringify(completedElectionsResult, null, 2));
    
    // Handle the case where completedElectionsResult is a QueryResult object
    let completedElections: any[] = [];
    if (completedElectionsResult && typeof completedElectionsResult === 'object') {
      // If it's a QueryResult object with rows, use the rows
      if ('rows' in completedElectionsResult && Array.isArray(completedElectionsResult.rows)) {
        completedElections = completedElectionsResult.rows;
      } 
      // If it's already an array, use it directly
      else if (Array.isArray(completedElectionsResult)) {
        completedElections = completedElectionsResult;
      }
    }
    
    console.log(`Found ${completedElections.length} completed elections`);
    
    // Handle the case where there might be no completed elections
    const result = [];
    
    // Ensure completedElections is an array before iterating
    if (completedElections.length > 0) {
      for (const election of completedElections) {
        let candidateResults = [];
        
        // First try to get results from blockchain if election has a blockchain ID
        if (election.blockchain_id) {
          try {
            const blockchainId = parseInt(election.blockchain_id);
            console.log(`Fetching blockchain results for election ${election.id} with blockchain_id ${blockchainId}`);
            
            // Check if election exists on blockchain
            const exists = await checkElectionExists(blockchainId);
            console.log(`Election ${election.id} exists on blockchain: ${exists}`);
            
            if (exists) {
              const blockchainResults = await getElectionResults(blockchainId);
              console.log(`Got blockchain results:`, JSON.stringify(blockchainResults, null, 2));
              
              if (Array.isArray(blockchainResults) && blockchainResults.length > 0) {
                // Get candidate details from database for matching
                const candidateDetailsQuery = sql`
                  SELECT 
                    c.id,
                    c.full_name,
                    c.student_id,
                    c.faculty,
                    c.blockchain_hash
                  FROM candidates c
                  JOIN election_candidates ec ON c.id = ec.candidate_id
                  WHERE ec.election_id = ${election.id}
                `;
                
                const candidateDetailsResult = await db.execute(candidateDetailsQuery);
                let candidateDetails = [];
                
                if (candidateDetailsResult && typeof candidateDetailsResult === 'object') {
                  if ('rows' in candidateDetailsResult && Array.isArray(candidateDetailsResult.rows)) {
                    candidateDetails = candidateDetailsResult.rows;
                  } else if (Array.isArray(candidateDetailsResult)) {
                    candidateDetails = candidateDetailsResult;
                  }
                }
                
                console.log(`Found ${candidateDetails.length} candidates in database for election ${election.id}`);
                
                // Map blockchain candidates to database candidates
                for (const blockchainCandidate of blockchainResults) {
                  console.log(`Processing blockchain candidate:`, JSON.stringify(blockchainCandidate, null, 2));
                  
                  // Find matching candidate in database
                  const dbCandidate = candidateDetails.find(c => 
                    c.student_id === blockchainCandidate.studentId || 
                    c.blockchain_hash === blockchainCandidate.hash
                  );
                  
                  if (dbCandidate) {
                    candidateResults.push({
                      id: dbCandidate.id,
                      full_name: dbCandidate.full_name,
                      student_id: dbCandidate.student_id,
                      faculty: dbCandidate.faculty,
                      vote_count: blockchainCandidate.voteCount,
                      faculty_name: getFacultyName(dbCandidate.faculty)
                    });
                  } else {
                    candidateResults.push({
                      id: 0,
                      full_name: `Candidate (${blockchainCandidate.studentId || 'Unknown'})`,
                      student_id: blockchainCandidate.studentId || 'Unknown',
                      faculty: 'Unknown',
                      vote_count: blockchainCandidate.voteCount,
                      faculty_name: 'Unknown'
                    });
                  }
                }
                
                // Sort by vote count
                candidateResults.sort((a, b) => b.vote_count - a.vote_count);
              }
            }
          } catch (err) {
            console.error(`Error fetching blockchain results for election ${election.id}:`, err);
          }
        }
        
        // If we didn't get any blockchain results, fall back to database
        if (candidateResults.length === 0) {
          console.log(`Falling back to database results for election ${election.id}`);
          
          try {
            const candidateVotesQuery = sql`
              SELECT 
                c.id,
                c.full_name,
                c.student_id,
                c.faculty,
                0 as vote_count
              FROM candidates c
              JOIN election_candidates ec ON c.id = ec.candidate_id
              WHERE ec.election_id = ${election.id}
              GROUP BY c.id, c.full_name, c.student_id, c.faculty
              ORDER BY c.full_name
            `;
            
            const candidatesResult = await db.execute(candidateVotesQuery);
            let candidates = [];
            
            if (candidatesResult && typeof candidatesResult === 'object') {
              if ('rows' in candidatesResult && Array.isArray(candidatesResult.rows)) {
                candidates = candidatesResult.rows;
              } else if (Array.isArray(candidatesResult)) {
                candidates = candidatesResult;
              }
            }
            
            candidateResults = candidates.map(c => ({
              ...c,
              faculty_name: getFacultyName(c.faculty)
            }));
          } catch (dbErr) {
            console.error(`Error fetching database results for election ${election.id}:`, dbErr);
          }
        }
        
        // Add to result if we have candidates
        result.push({
          ...election,
          status: 'completed',
          candidates: candidateResults
        });
      }
    }
    
    console.log(`Returning ${result.length} completed elections with candidates`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching completed election stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Time series voting data
router.get('/metrics/voting-timeline', isAdmin, async (req: Request, res: Response) => {
  try {
    const electionId = req.query.electionId ? parseInt(req.query.electionId as string) : null;
    
    console.log(`Fetching voting timeline data for election ID: ${electionId || 'all elections'}`);
    
    // Since we don't have voting data in the database (it's all on blockchain),
    // we'll return a sample timeline with the current day hours
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const timelineSamples = [];
    
    // Generate 24 hours of sample data for the current day
    for (let i = 0; i < 24; i++) {
      const hour = new Date(today);
      hour.setHours(i);
      
      timelineSamples.push({
        hour: hour,
        vote_count: 0,
        formatted_hour: hour.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        day_of_week: hour.toLocaleDateString('en-US', { weekday: 'long' })
      });
    }
    
    console.log("Voting timeline generated:", JSON.stringify(timelineSamples, null, 2));
    
    res.json(timelineSamples);
  } catch (error) {
    console.error('Error generating voting timeline metrics:', error);
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
    
    // Since we don't have blockchain_transactions table active,
    // we'll provide a default value for transaction stats
    const transactionStats = [{ 
      total_transactions: 0, 
      successful_transactions: 0 
    }] as unknown as BlockchainTransaction[];
    
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
    // Get currently active elections - we'll get vote counts from the blockchain
    const activeElectionsQuery = sql`
      SELECT 
        e.id,
        e.name,
        e.position,
        e.blockchain_id,
        0 as vote_count,
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND faculty NOT IN ('Administration')) as total_eligible_voters
      FROM elections e
      WHERE e.status = 'active' OR e.status = 'upcoming'
      GROUP BY e.id, e.name, e.position, e.blockchain_id
      ORDER BY e.created_at DESC
    `;

    // Add debug logging
    console.log("Executing active elections query:", activeElectionsQuery.toString());
    
    const activeElectionsResult = await db.execute(activeElectionsQuery);
    console.log("Active elections raw result:", JSON.stringify(activeElectionsResult, null, 2));
    
    // Ensure we properly handle the result
    let activeElections: (ActiveElection & { status: string })[] = [];
    if (activeElectionsResult && typeof activeElectionsResult === 'object') {
      if ('rows' in activeElectionsResult && Array.isArray(activeElectionsResult.rows)) {
        activeElections = activeElectionsResult.rows as unknown as ActiveElection[];
      } else if (Array.isArray(activeElectionsResult)) {
        activeElections = activeElectionsResult as unknown as ActiveElection[];
      }
    }
    
    // Get the election statuses to include in the result
    let electionStatusesQuery = sql`SELECT id, status FROM elections WHERE false`;
    
    // Only build the query if we have active elections
    if (activeElections.length > 0) {
      electionStatusesQuery = sql`
        SELECT id, status FROM elections 
        WHERE id IN (${sql.join(activeElections.map(e => e.id))})
      `;
    }
    const electionStatuses = await db.execute(electionStatusesQuery);
    const statusMap = new Map();
    
    if (electionStatuses && typeof electionStatuses === 'object') {
      if ('rows' in electionStatuses && Array.isArray(electionStatuses.rows)) {
        electionStatuses.rows.forEach((row: any) => statusMap.set(row.id, row.status));
      } else if (Array.isArray(electionStatuses)) {
        electionStatuses.forEach((row: any) => statusMap.set(row.id, row.status));
      }
    }
    
    console.log("Active/upcoming elections parsed:", JSON.stringify(activeElections, null, 2));
    console.log("Election statuses:", JSON.stringify([...statusMap.entries()], null, 2));
    
    // Handle the case where there might be no active/upcoming elections
    const result: (ActiveElection & { candidates: Candidate[], status: string })[] = [];
    
    // Ensure activeElections is an array before iterating
    if (Array.isArray(activeElections) && activeElections.length > 0) {
      for (const election of activeElections) {
        console.log(`Processing election ${election.id} (${election.name})`);
        
        // Check if the election has blockchain data
        let candidateResults: Candidate[] = [];
        
        if (election.blockchain_id) {
          console.log(`Election ${election.id} has blockchain_id ${election.blockchain_id}, checking blockchain data`);
          try {
            // Try to get data from blockchain if it exists there
            const exists = await checkElectionExists(election.blockchain_id);
            if (exists) {
              console.log(`Election ${election.id} exists on blockchain, fetching results`);
              const blockchainResults = await getElectionResults(election.blockchain_id);
              if (Array.isArray(blockchainResults) && blockchainResults.length > 0) {
                // Get candidate details from database for matching
                const candidateDetailsQuery = sql`
                  SELECT 
                    c.id, c.full_name, c.student_id, c.faculty, c.blockchain_hash
                  FROM candidates c
                  JOIN election_candidates ec ON c.id = ec.candidate_id
                  WHERE ec.election_id = ${election.id}
                `;
                
                const candidateDetailsResult = await db.execute(candidateDetailsQuery);
                let candidateDetails: any[] = [];
                
                if (candidateDetailsResult && typeof candidateDetailsResult === 'object') {
                  if ('rows' in candidateDetailsResult && Array.isArray(candidateDetailsResult.rows)) {
                    candidateDetails = candidateDetailsResult.rows;
                  } else if (Array.isArray(candidateDetailsResult)) {
                    candidateDetails = candidateDetailsResult;
                  }
                }
                
                console.log(`Found ${candidateDetails.length} candidates in database for election ${election.id}`);
                
                // Map blockchain candidates to database candidates
                for (const blockchainCandidate of blockchainResults) {
                  console.log(`Processing blockchain candidate:`, JSON.stringify(blockchainCandidate, null, 2));
                  
                  // Find matching candidate in database
                  const dbCandidate = candidateDetails.find((c: any) => 
                    c.student_id === blockchainCandidate.studentId || 
                    c.blockchain_hash === blockchainCandidate.hash
                  );
                  
                  if (dbCandidate) {
                    candidateResults.push({
                      id: dbCandidate.id,
                      full_name: dbCandidate.full_name,
                      student_id: dbCandidate.student_id,
                      faculty: dbCandidate.faculty,
                      vote_count: blockchainCandidate.voteCount,
                      faculty_name: getFacultyName(dbCandidate.faculty)
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching blockchain data for election ${election.id}:`, error);
          }
        }
        
        // If we couldn't get data from blockchain or there was no blockchain ID, 
        // fall back to database
        if (candidateResults.length === 0) {
          console.log(`Getting candidate list for election ${election.id} without vote data`);
          const candidateListQuery = sql`
            SELECT 
              c.id,
              c.full_name,
              c.student_id,
              c.faculty,
              0 as vote_count
            FROM candidates c
            JOIN election_candidates ec ON c.id = ec.candidate_id
            WHERE ec.election_id = ${election.id}
            ORDER BY c.full_name
          `;
          
          const candidatesResult = await db.execute(candidateListQuery);
          if (candidatesResult && typeof candidatesResult === 'object') {
            if ('rows' in candidatesResult && Array.isArray(candidatesResult.rows)) {
              candidateResults = candidatesResult.rows as unknown as Candidate[];
            } else if (Array.isArray(candidatesResult)) {
              candidateResults = candidatesResult as unknown as Candidate[];
            }
          }
        }
        
        result.push({
          ...election,
          status: statusMap.get(election.id) || 'active',
          candidates: candidateResults.map(c => ({
            ...c,
            faculty_name: getFacultyName(c.faculty)
          }))
        });
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching active election stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Overall participation stats - now using blockchain data when available
router.get('/metrics/participation-overview', isAdmin, async (req: Request, res: Response) => {
  try {
    // Get election info without vote data
    const query = sql`
      SELECT 
        e.id,
        e.name,
        e.position,
        e.status,
        e.blockchain_id,
        0 as voters,
        (SELECT COUNT(*) FROM users WHERE is_admin = false AND faculty NOT IN ('Administration')) as total_eligible_voters
      FROM elections e
      ORDER BY e.id DESC
    `;

    let queryResult = await db.execute(query);
    
    // Properly handle the query result to ensure we have an array
    let participationStats: any[] = [];
    if (queryResult && typeof queryResult === 'object') {
      if ('rows' in queryResult && Array.isArray(queryResult.rows)) {
        participationStats = queryResult.rows;
      } else if (Array.isArray(queryResult)) {
        participationStats = queryResult;
      }
    }
    
    console.log("Participation stats raw query result:", JSON.stringify(participationStats, null, 2));
    
    // For each election with a blockchain ID, try to get actual vote counts
    const result: ParticipationOverview[] = [];
    
    // Make sure we have an array to iterate over
    if (Array.isArray(participationStats)) {
      for (const election of participationStats) {
        let voters = 0;
        
        // If the election has a blockchain ID, try to get vote counts from the blockchain
        if (election.blockchain_id) {
          try {
            const blockchainId = parseInt(election.blockchain_id);
            const exists = await checkElectionExists(blockchainId);
            
            if (exists) {
              const blockchainResults = await getElectionResults(blockchainId);
              if (Array.isArray(blockchainResults) && blockchainResults.length > 0) {
                // Sum up all votes from blockchain
                voters = blockchainResults.reduce((sum, candidate) => 
                  sum + parseInt(candidate.voteCount), 0);
              }
            }
          } catch (err) {
            console.error(`Error fetching blockchain data for election ${election.id}:`, err);
          }
        }
        
        // Calculate participation percentage
        const participation_percentage = 
          election.total_eligible_voters > 0 
            ? (voters / election.total_eligible_voters) * 100 
            : 0;
        
        result.push({
          id: election.id,
          name: election.name,
          position: election.position,
          status: election.status,
          voters: voters,
          total_eligible_voters: election.total_eligible_voters,
          participation_percentage: participation_percentage
        });
      }
    }
    
    res.json(result);
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
      open: 0,  // Using "open" in code but displaying as "new" in UI
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