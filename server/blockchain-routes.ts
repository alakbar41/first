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
      res.json({ address });
    } catch (error) {
      console.error('Error getting contract address:', error);
      res.status(500).json({ message: 'Contract address not configured' });
    }
  });

  // Get student ID from hash
  app.get('/api/blockchain/student-id-from-hash/:hash', (req: Request, res: Response) => {
    const hash = req.params.hash;
    const studentId = getStudentIdFromHash(hash);
    
    if (!studentId) {
      return res.status(404).json({ message: 'Student ID not found for hash' });
    }
    
    res.json({ studentId });
  });

  // Deploy election to blockchain
  app.post('/api/blockchain/deploy-election/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const electionId = parseInt(req.params.id);
      
      // Get election from database
      const election = await storage.getElection(electionId);
      if (!election) {
        return res.status(404).json({ message: 'Election not found' });
      }
      
      // Check if election already has a blockchain ID
      if (election.blockchainId !== null && election.blockchainId !== undefined) {
        return res.status(400).json({ 
          message: 'Election already deployed to blockchain',
          blockchainId: election.blockchainId
        });
      }
      
      // Get candidates for this election
      const electionCandidates = await storage.getElectionCandidates(electionId);
      if (electionCandidates.length < 2) {
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
        return res.status(404).json({ message: 'Election not found on blockchain' });
      }
      
      // Get results
      const results = await getElectionResults(blockchainId);
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
      const { electionId, candidateId } = req.body;
      
      // This endpoint just confirms the voting request was received
      // Actual voting happens client-side with MetaMask
      
      // Record the vote in our database for backup/verification
      if (req.user?.id) {
        await storage.recordVote(req.user.id, electionId);
      }
      
      res.json({ success: true });
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