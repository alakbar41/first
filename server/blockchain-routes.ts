import { Express, Request, Response } from 'express';

// Define RequestWithUser using Express.Request that already has the user property thanks to type augmentation
type RequestWithUser = Request & {
  user?: {
    id: number;
    email: string;
    isAdmin: boolean;
    faculty: string;
    [key: string]: any;
  };
};
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
import { mailer } from './mailer';

/**
 * Register blockchain-related routes
 */
export function registerBlockchainRoutes(app: Express) {
  // Get contract address
  app.get('/api/blockchain/contract-address', (req: Request, res: Response) => {
    try {
      // Use the hardcoded contract address for Polygon mainnet
      const contractAddress = "0xda3d2afDD74556fdfa0353D210C649EB09CefB0c";
      
      // Return the contract address with network information
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        contractAddress,
        isConfigured: true,
        network: 'polygon-mainnet'
      });
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
      
      // Check if the start date is in the past, and if so, adjust it
      let startDate = new Date(election.startDate);
      const currentTime = new Date();
      
      if (startDate <= currentTime) {
        // Add 5 minutes to the current time to ensure it's in the future
        startDate = new Date(currentTime.getTime() + 5 * 60 * 1000);
        console.log(`Warning: Election start date was in the past. Adjusted from ${election.startDate} to ${startDate}`);
      }
      
      // Prepare data for blockchain deployment (client-side)
      // The createBlockchainElection function will map the position to the correct enum value
      const electionData = await createBlockchainElection(
        election.position,
        startDate, // Use the potentially adjusted start date
        new Date(election.endDate),
        candidateStudentIds
      );
      
      // Log timestamp comparison for debugging
      const currentTimestamp = Math.floor(Date.now() / 1000);
      console.log(`Current timestamp: ${currentTimestamp}, Election start timestamp: ${electionData.startTimestamp}`);
      console.log(`Is election in the future? ${electionData.startTimestamp > currentTimestamp ? 'Yes' : 'No'}`);
      
      // Do NOT update the election with blockchain ID yet
      // We'll update it only after the client successfully deploys it
      // Get the current election data without updating
      const currentElection = await storage.getElection(electionId);
      
      // Return the deployment data to the client
      res.setHeader('Content-Type', 'application/json');
      
      res.json({ 
        message: 'Election prepared for blockchain deployment',
        election: currentElection,
        deployParams: electionData.deployParams,
        blockchainId: electionData.startTimestamp,
        adjustedStartDate: startDate.getTime() !== new Date(election.startDate).getTime() ? startDate : undefined
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
  app.post('/api/blockchain/vote', isAuthenticated, async (req: RequestWithUser, res: Response) => {
    try {
      const { electionId, candidateHash, txHash } = req.body;
      
      console.log(`Recording vote in election ${electionId} for candidate hash ${candidateHash} with transaction hash ${txHash}`);
      
      // This endpoint confirms the voting request was received
      // and records participation in the vote_participation table
      // Actual voting already happened client-side with MetaMask
      
      // Get student ID from hash (if possible) for record-keeping
      let studentId = 'unknown';
      let candidateName = 'Unknown Candidate';
      let electionName = 'Unknown Election';
      let databaseElectionId = -1;
      
      try {
        const idResult = await getStudentIdFromHash(candidateHash);
        if (idResult) {
          studentId = idResult;
          
          // Get candidate details
          const candidate = await storage.getCandidateByStudentId(studentId);
          if (candidate) {
            candidateName = candidate.fullName;
          }
        }
      } catch (e) {
        console.warn('Could not resolve candidate hash to student ID:', e);
      }
      
      // Get election details - we need to be careful with blockchain ID vs database ID
      console.log(`Trying to find election with blockchain ID or DB ID: ${electionId}`);
      try {
        // First try to find an election with this blockchain ID
        const electionsByBlockchainId = await storage.getElectionByBlockchainId(electionId);
        if (electionsByBlockchainId) {
          console.log(`Found election by blockchain ID: ${electionsByBlockchainId.name} (ID: ${electionsByBlockchainId.id})`);
          electionName = electionsByBlockchainId.name;
          databaseElectionId = electionsByBlockchainId.id;
        } else {
          console.log(`No election found with blockchain ID: ${electionId}, trying database ID`);
          // If not found by blockchain ID, try by database ID (less likely)
          const electionByDbId = await storage.getElection(parseInt(electionId));
          if (electionByDbId) {
            console.log(`Found election by database ID: ${electionByDbId.name} (ID: ${electionByDbId.id})`);
            electionName = electionByDbId.name;
            databaseElectionId = electionByDbId.id;
          } else {
            console.log(`No election found with database ID: ${electionId} either`);
            return res.status(404).json({
              message: 'Election not found'
            });
          }
        }
      } catch (e) {
        console.warn('Could not get election details:', e);
        return res.status(500).json({
          message: 'Failed to get election details',
          error: e instanceof Error ? e.message : String(e)
        });
      }
      
      // Make sure we have a valid election ID for the database
      if (databaseElectionId <= 0) {
        return res.status(400).json({
          message: 'Invalid election ID'
        });
      }
      
      // Check if user has already participated in this election
      if (!req.user?.id) {
        return res.status(401).json({
          message: 'User not authenticated'
        });
      }
      
      // Check vote_participation table to see if user already voted
      const hasParticipated = await storage.hasUserParticipated(req.user.id, databaseElectionId);
      
      if (hasParticipated) {
        console.warn(`User ${req.user.id} attempted to vote again in election ${databaseElectionId} using a different wallet address`);
        return res.status(400).json({ 
          message: "You have already voted in this election. Each student may only vote once regardless of which wallet is used." 
        });
      }
      
      // Record vote participation in vote_participation table
      await storage.recordVoteParticipation(req.user.id, databaseElectionId);
      console.log(`Vote participation recorded for user ${req.user.id} in election ${databaseElectionId} in vote_participation table`);
      
      // Send email confirmation if we have a transaction hash
      if (txHash && req.user.email) {
        console.log(`Attempting to send vote confirmation email to ${req.user.email}`);
        console.log(`Election name: "${electionName}", Candidate name: "${candidateName}"`);
        
        try {
          await mailer.sendVoteConfirmation(
            req.user.email,
            txHash,
            electionName,
            candidateName
          );
          console.log(`Vote confirmation email sent to ${req.user.email} with transaction hash ${txHash}`);
        } catch (emailError: any) {
          console.error('Failed to send vote confirmation email:', emailError);
          console.error('Error details:', emailError.message || 'No error message');
          console.error('Error stack:', emailError.stack || 'No stack trace');
          // Continue even if email fails - don't block the response
        }
      } else {
        console.log(`Missing information for email confirmation: txHash=${!!txHash}, userEmail=${!!req.user?.email}`);
      }
      
      res.json({ 
        success: true,
        message: 'Vote participation recorded successfully in vote_participation table'
      });
    } catch (error: any) {
      console.error('Error recording vote participation:', error);
      res.status(500).json({ 
        message: 'Failed to record vote participation',
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
  
  // Update election with blockchain ID after successful client-side deployment
  app.post('/api/blockchain/confirm-deployment/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      const electionId = parseInt(req.params.id);
      const { blockchainId, txHash } = req.body;
      
      if (!blockchainId) {
        return res.status(400).json({ message: 'Missing blockchainId parameter' });
      }
      
      // Update the election with blockchain ID
      const updatedElection = await storage.updateElection(electionId, { 
        blockchainId: blockchainId 
      });
      
      console.log(`Election ${electionId} successfully deployed to blockchain with ID ${blockchainId}, transaction: ${txHash}`);
      
      res.json({
        success: true,
        message: 'Election blockchain deployment confirmed',
        election: updatedElection
      });
    } catch (error: any) {
      console.error('Error confirming blockchain deployment:', error);
      res.status(500).json({ 
        message: 'Failed to confirm blockchain deployment',
        error: error.message
      });
    }
  });
}