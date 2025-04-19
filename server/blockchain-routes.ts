import { Express, Request, Response } from 'express';
import { 
  getContractAddress, 
  getStudentIdFromHash, 
  studentIdToBytes32,
  createElection as createBlockchainElection,
  getElectionResults,
  checkElectionExists
} from './blockchain';
import { isAdmin, isAuthenticated } from './routes';
import { storage } from './storage';

/**
 * Register blockchain-related routes
 */
export function registerBlockchainRoutes(app: Express) {
  // Get contract address
  app.get('/api/blockchain/contract-address', (req: Request, res: Response) => {
    try {
      const address = getContractAddress();
      // Ensure we return proper JSON instead of HTML
      res.setHeader('Content-Type', 'application/json');
      res.json({ address });
    } catch (error) {
      console.error('Error getting contract address:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: 'Contract address not configured' });
    }
  });

  // Get student ID from hash
  app.get('/api/blockchain/student-id-from-hash/:hash', async (req: Request, res: Response) => {
    const hash = req.params.hash;
    try {
      console.log(`Looking up student ID for hash: ${hash}`);
      const studentId = await getStudentIdFromHash(hash);
      
      if (!studentId) {
        console.log(`No student ID found for hash: ${hash}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ 
          message: 'Student ID not found for hash',
          hash: hash 
        });
      }
      
      console.log(`Found student ID for hash ${hash}: ${studentId}`);
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        studentId: studentId,
        hash: hash 
      });
    } catch (error) {
      console.error('Error getting student ID from hash:', error);
      res.status(500).json({ 
        message: 'Failed to retrieve student ID',
        hash: hash,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Deploy election to blockchain
  app.post('/api/blockchain/deploy-election/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const electionId = parseInt(req.params.id);
      
      // Get election from database
      const election = await storage.getElection(electionId);
      if (!election) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ message: 'Election not found' });
      }
      
      // Check if election already has a blockchain ID
      if (election.blockchainId !== null && election.blockchainId !== undefined) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ 
          message: 'Election already deployed to blockchain',
          blockchainId: election.blockchainId
        });
      }
      
      // Get candidates for this election
      const electionCandidates = await storage.getElectionCandidates(electionId);
      if (electionCandidates.length < 2) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ 
          message: 'Election must have at least 2 candidates before deploying to blockchain' 
        });
      }
      
      // Get full candidate details
      const candidatesWithDetails = await Promise.all(
        electionCandidates.map(async (ec) => {
          return await storage.getCandidate(ec.candidateId);
        })
      );
      
      // Extract student IDs for blockchain
      const candidateStudentIds = candidatesWithDetails
        .filter(c => c !== undefined)
        .map(c => c!.studentId);
      
      // Deploy to blockchain
      const blockchainId = await createBlockchainElection(
        election.position as 'Senator' | 'President/VP',
        new Date(election.startDate),
        new Date(election.endDate),
        candidateStudentIds
      );
      
      // Update election in database with blockchain ID
      const updatedElection = await storage.updateElection(electionId, { 
        blockchainId: blockchainId 
      });
      
      res.json({ 
        message: 'Election deployed to blockchain successfully',
        election: updatedElection
      });
    } catch (error: any) {
      console.error('Error deploying election to blockchain:', error);
      res.status(500).json({ 
        message: 'Failed to deploy election to blockchain',
        error: error.message
      });
    }
  });

  // Get election results from blockchain
  app.get('/api/blockchain/election-results/:blockchainId', async (req: Request, res: Response) => {
    try {
      const blockchainId = parseInt(req.params.blockchainId);
      
      // Check if election exists on blockchain
      const exists = await checkElectionExists(blockchainId);
      if (!exists) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ message: 'Election not found on blockchain' });
      }
      
      // Get results
      const results = await getElectionResults(blockchainId);
      res.setHeader('Content-Type', 'application/json');
      res.json(results);
    } catch (error: any) {
      console.error('Error getting election results:', error);
      res.status(500).json({ 
        message: 'Failed to get election results from blockchain',
        error: error.message
      });
    }
  });

  // Vote in election
  app.post('/api/blockchain/vote', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { electionId, candidateHash } = req.body;
      
      console.log(`Recording vote in election ${electionId} for candidate hash ${candidateHash}`);
      
      // This endpoint confirms the voting request was received
      // and records a backup of the vote in our database
      // Actual voting already happened client-side with MetaMask
      
      // Get student ID from hash (if possible) for record-keeping
      let studentId = 'unknown';
      try {
        const idResult = await getStudentIdFromHash(candidateHash);
        if (idResult) {
          studentId = idResult;
        }
      } catch (e) {
        console.warn('Could not resolve candidate hash to student ID:', e);
      }
      
      // Record the vote in our database for backup/verification
      if (req.user?.id) {
        await storage.recordVote(req.user.id, electionId);
        console.log(`Vote recorded for user ${req.user.id} in election ${electionId} for candidate ${studentId}`);
      }
      
      res.json({ 
        success: true,
        message: 'Vote recorded successfully'
      });
    } catch (error: any) {
      console.error('Error recording vote:', error);
      res.status(500).json({ 
        message: 'Failed to record vote',
        error: error.message
      });
    }
  });

  // Hash a student ID (for debugging/testing)
  app.get('/api/blockchain/hash-student-id/:studentId', isAdmin, (req: Request, res: Response) => {
    const studentId = req.params.studentId;
    const hash = studentIdToBytes32(studentId);
    res.json({ studentId, hash });
  });
}