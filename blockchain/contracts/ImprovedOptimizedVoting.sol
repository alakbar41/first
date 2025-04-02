// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ImprovedOptimizedVoting
 * @dev An enhanced, gas-optimized smart contract for managing university voting
 * that only stores essential voting data on the blockchain with added security features
 */
contract ImprovedOptimizedVoting is Ownable {
    
    // Election types - kept simple for reference
    enum ElectionType { Senator, PresidentVP }
    
    // Election statuses
    enum ElectionStatus { Pending, Active, Completed, Cancelled }
    
    // Improved Election structure with time bounds
    struct Election {
        uint256 id;
        ElectionType electionType;
        ElectionStatus status;
        uint256 startTime;      // New: When the election starts
        uint256 endTime;        // New: When the election ends
        uint256 totalVotesCast;
        bool resultsFinalized;
    }
    
    // Optimized vote counting - only IDs and votes
    struct VoteCounter {
        uint256 id;
        uint256 voteCount;
    }
    
    // Storage variables
    uint256 private nextElectionId = 1;
    uint256 private nextCandidateId = 1;
    uint256 private nextTicketId = 1;
    uint256 private nextNonce = 1;   // New: For preventing replay attacks
    
    // Main data structures
    mapping(uint256 => Election) public elections;
    mapping(uint256 => VoteCounter) public candidates;
    mapping(uint256 => VoteCounter) public tickets;
    
    // Improved relations between entities using mappings for O(1) lookups
    mapping(uint256 => mapping(uint256 => bool)) private electionCandidateMap;  // electionId => candidateId => exists
    mapping(uint256 => mapping(uint256 => bool)) private electionTicketMap;     // electionId => ticketId => exists
    mapping(uint256 => uint256[]) private electionCandidateIds;  // For enumeration
    mapping(uint256 => uint256[]) private electionTicketIds;     // For enumeration
    
    // Voter management
    mapping(uint256 => mapping(address => bool)) private hasVoted;     // electionId => voter => hasVoted
    mapping(address => bool) public registeredVoters;                 // New: Voter authentication
    mapping(address => uint256) private voterNonces;                  // New: Prevent replay attacks
    
    // Election results tracking
    mapping(uint256 => uint256) private electionWinners;        // electionId => winningCandidateId/ticketId
    
    // Events
    event ElectionCreated(uint256 indexed electionId, uint8 electionType, uint256 startTime, uint256 endTime);
    event ElectionStatusChanged(uint256 indexed electionId, uint8 status);
    event VoterRegistered(address indexed voter);
    event CandidateRegistered(uint256 indexed candidateId);
    event TicketCreated(uint256 indexed ticketId, uint256 presidentId, uint256 vpId);
    event VoteCast(uint256 indexed electionId, address indexed voter, uint256 nonce);
    event ResultsFinalized(uint256 indexed electionId, uint256 winnerId, uint256 winnerVotes);
    
    /**
     * @dev Constructor sets contract deployer as the owner
     */
    constructor() Ownable(msg.sender) {
        // Register the owner as a voter by default
        registeredVoters[msg.sender] = true;
        emit VoterRegistered(msg.sender);
    }
    
    // Modifiers
    
    /**
     * @dev Ensures an election exists
     */
    modifier electionExists(uint256 electionId) {
        require(elections[electionId].id == electionId, "Election does not exist");
        _;
    }
    
    /**
     * @dev Ensures an election is active based on status and time bounds
     */
    modifier electionActive(uint256 electionId) {
        Election storage election = elections[electionId];
        require(
            election.status == ElectionStatus.Active,
            "Election is not active"
        );
        
        // Check time constraints
        require(
            block.timestamp >= election.startTime,
            "Election has not started yet"
        );
        require(
            block.timestamp <= election.endTime,
            "Election has ended"
        );
        _;
    }
    
    /**
     * @dev Ensures an election is not finalized
     */
    modifier resultsNotFinalized(uint256 electionId) {
        require(
            !elections[electionId].resultsFinalized,
            "Results are already finalized"
        );
        _;
    }
    
    /**
     * @dev Ensures voter has not voted in this election
     */
    modifier hasNotVoted(uint256 electionId) {
        require(!hasVoted[electionId][msg.sender], "Already voted in this election");
        _;
    }
    
    /**
     * @dev Ensures caller is a registered voter
     */
    modifier onlyRegisteredVoter() {
        require(registeredVoters[msg.sender], "Not a registered voter");
        _;
    }
    
    /**
     * @dev Ensures a candidate exists
     */
    modifier candidateExists(uint256 candidateId) {
        require(candidates[candidateId].id == candidateId, "Candidate does not exist");
        _;
    }
    
    /**
     * @dev Ensures a ticket exists
     */
    modifier ticketExists(uint256 ticketId) {
        require(tickets[ticketId].id == ticketId, "Ticket does not exist");
        _;
    }
    
    /**
     * @dev Verifies voter nonce to prevent replay attacks
     */
    modifier validNonce(uint256 nonce) {
        require(nonce > voterNonces[msg.sender], "Invalid nonce");
        _;
    }
    
    // Voter Management Functions
    
    /**
     * @dev Register a new voter
     */
    function registerVoter(address voter) external onlyOwner {
        require(!registeredVoters[voter], "Voter already registered");
        
        registeredVoters[voter] = true;
        emit VoterRegistered(voter);
    }
    
    /**
     * @dev Register multiple voters at once
     */
    function registerVotersBatch(address[] calldata voters) external onlyOwner {
        for (uint256 i = 0; i < voters.length; i++) {
            if (!registeredVoters[voters[i]]) {
                registeredVoters[voters[i]] = true;
                emit VoterRegistered(voters[i]);
            }
        }
    }
    
    /**
     * @dev Get the next nonce for a voter
     */
    function getNextNonce() external view returns (uint256) {
        return voterNonces[msg.sender] + 1;
    }
    
    // Election Management Functions
    
    /**
     * @dev Create a new election with time bounds
     */
    function createElection(
        uint8 electionType, 
        uint256 startTime, 
        uint256 endTime
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");
        
        uint256 electionId = nextElectionId++;
        
        elections[electionId] = Election({
            id: electionId,
            electionType: ElectionType(electionType),
            status: ElectionStatus.Pending,
            startTime: startTime,
            endTime: endTime,
            totalVotesCast: 0,
            resultsFinalized: false
        });
        
        emit ElectionCreated(electionId, electionType, startTime, endTime);
        
        return electionId;
    }
    
    /**
     * @dev Update an election's status
     * Now also can automatically activate based on time
     */
    function updateElectionStatus(uint256 electionId, uint8 status) 
        external 
        onlyOwner 
        electionExists(electionId) 
    {
        if (status == uint8(ElectionStatus.Active)) {
            // Only allow activating if we're in the right time window
            require(
                block.timestamp >= elections[electionId].startTime,
                "Cannot activate before start time"
            );
            require(
                block.timestamp <= elections[electionId].endTime,
                "Cannot activate after end time"
            );
        }
        
        elections[electionId].status = ElectionStatus(status);
        emit ElectionStatusChanged(electionId, status);
    }
    
    /**
     * @dev Automatic election status update based on time
     * Can be called by anyone to update election status according to time
     */
    function autoUpdateElectionStatus(uint256 electionId) 
        external 
        electionExists(electionId) 
    {
        Election storage election = elections[electionId];
        
        // Only update if not already Completed or Cancelled
        if (election.status == ElectionStatus.Completed || 
            election.status == ElectionStatus.Cancelled) {
            return;
        }
        
        // Auto-activate if time has come
        if (election.status == ElectionStatus.Pending && 
            block.timestamp >= election.startTime) {
            election.status = ElectionStatus.Active;
            emit ElectionStatusChanged(electionId, uint8(ElectionStatus.Active));
        }
        
        // Auto-complete if time has passed
        if (election.status == ElectionStatus.Active && 
            block.timestamp > election.endTime) {
            election.status = ElectionStatus.Completed;
            emit ElectionStatusChanged(electionId, uint8(ElectionStatus.Completed));
        }
    }
    
    /**
     * @dev Finalize the results of an election and determine the winner
     */
    function finalizeResults(uint256 electionId) 
        external 
        onlyOwner 
        electionExists(electionId)
        resultsNotFinalized(electionId)
    {
        // First auto-update status to ensure it's correct
        this.autoUpdateElectionStatus(electionId);
        
        Election storage election = elections[electionId];
        
        // Ensure election is completed
        require(
            election.status == ElectionStatus.Completed,
            "Election must be completed to finalize results"
        );
        
        // Find the winner
        uint256 winnerId = 0;
        uint256 maxVotes = 0;
        
        if (election.electionType == ElectionType.Senator) {
            // Find candidate with most votes
            uint256[] memory candidateIds = electionCandidateIds[electionId];
            for (uint256 i = 0; i < candidateIds.length; i++) {
                uint256 candidateId = candidateIds[i];
                uint256 votes = candidates[candidateId].voteCount;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winnerId = candidateId;
                }
            }
        } else {
            // Find ticket with most votes
            uint256[] memory ticketIds = electionTicketIds[electionId];
            for (uint256 i = 0; i < ticketIds.length; i++) {
                uint256 ticketId = ticketIds[i];
                uint256 votes = tickets[ticketId].voteCount;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winnerId = ticketId;
                }
            }
        }
        
        // Save the winner
        electionWinners[electionId] = winnerId;
        
        // Finalize the results
        election.resultsFinalized = true;
        emit ResultsFinalized(electionId, winnerId, maxVotes);
    }
    
    // Candidate Management Functions
    
    /**
     * @dev Register a new candidate with minimal data
     */
    function registerCandidate() external onlyOwner returns (uint256) {
        uint256 candidateId = nextCandidateId++;
        
        candidates[candidateId] = VoteCounter({
            id: candidateId,
            voteCount: 0
        });
        
        emit CandidateRegistered(candidateId);
        
        return candidateId;
    }
    
    /**
     * @dev Add a candidate to an election
     */
    function addCandidateToElection(uint256 electionId, uint256 candidateId) 
        external 
        onlyOwner 
        electionExists(electionId)
        candidateExists(candidateId)
    {
        // Ensure election is not active or completed
        require(
            elections[electionId].status == ElectionStatus.Pending,
            "Cannot add candidates to active or completed elections"
        );
        
        // Ensure candidate not already added
        require(
            !electionCandidateMap[electionId][candidateId],
            "Candidate already added to this election"
        );
        
        // Add candidate to election using O(1) mapping
        electionCandidateMap[electionId][candidateId] = true;
        electionCandidateIds[electionId].push(candidateId);
    }
    
    /**
     * @dev Create a President/VP ticket
     */
    function createTicket(uint256 presidentId, uint256 vpId) 
        external 
        onlyOwner 
        candidateExists(presidentId)
        candidateExists(vpId)
    {
        // Ensure president and VP are different candidates
        require(presidentId != vpId, "President and VP must be different candidates");
        
        uint256 ticketId = nextTicketId++;
        
        tickets[ticketId] = VoteCounter({
            id: ticketId,
            voteCount: 0
        });
        
        emit TicketCreated(ticketId, presidentId, vpId);
        
        return;
    }
    
    /**
     * @dev Add a ticket to an election
     */
    function addTicketToElection(uint256 electionId, uint256 ticketId)
        external
        onlyOwner
        electionExists(electionId)
        ticketExists(ticketId)
    {
        // Ensure election is of type PresidentVP
        require(
            elections[electionId].electionType == ElectionType.PresidentVP,
            "Election must be of type PresidentVP"
        );
        
        // Ensure election is not active or completed
        require(
            elections[electionId].status == ElectionStatus.Pending,
            "Cannot add tickets to active or completed elections"
        );
        
        // Ensure ticket not already added
        require(
            !electionTicketMap[electionId][ticketId],
            "Ticket already added to this election"
        );
        
        // Add ticket to election using O(1) mapping
        electionTicketMap[electionId][ticketId] = true;
        electionTicketIds[electionId].push(ticketId);
    }
    
    // Voting Functions
    
    /**
     * @dev Vote for a senator candidate with nonce for replay protection
     */
    function voteForSenator(uint256 electionId, uint256 candidateId, uint256 nonce) 
        external 
        electionExists(electionId)
        electionActive(electionId)
        candidateExists(candidateId)
        hasNotVoted(electionId)
        onlyRegisteredVoter()
        validNonce(nonce)
        returns (bool)
    {
        // Ensure election is of type Senator
        require(
            elections[electionId].electionType == ElectionType.Senator,
            "Election must be of type Senator"
        );
        
        // Ensure candidate is part of this election - O(1) lookup
        require(
            electionCandidateMap[electionId][candidateId],
            "Candidate is not part of this election"
        );
        
        // Update nonce
        voterNonces[msg.sender] = nonce;
        
        // Record the vote
        candidates[candidateId].voteCount++;
        
        // Mark voter as having voted
        hasVoted[electionId][msg.sender] = true;
        
        // Update total votes
        elections[electionId].totalVotesCast++;
        
        emit VoteCast(electionId, msg.sender, nonce);
        
        return true;
    }
    
    /**
     * @dev Vote for a President/VP ticket with nonce for replay protection
     */
    function voteForPresidentVP(uint256 electionId, uint256 ticketId, uint256 nonce) 
        external 
        electionExists(electionId)
        electionActive(electionId)
        ticketExists(ticketId)
        hasNotVoted(electionId)
        onlyRegisteredVoter()
        validNonce(nonce)
        returns (bool)
    {
        // Ensure election is of type PresidentVP
        require(
            elections[electionId].electionType == ElectionType.PresidentVP,
            "Election must be of type PresidentVP"
        );
        
        // Ensure ticket is part of this election - O(1) lookup
        require(
            electionTicketMap[electionId][ticketId],
            "Ticket is not part of this election"
        );
        
        // Update nonce
        voterNonces[msg.sender] = nonce;
        
        // Record the vote
        tickets[ticketId].voteCount++;
        
        // Mark voter as having voted
        hasVoted[electionId][msg.sender] = true;
        
        // Update total votes
        elections[electionId].totalVotesCast++;
        
        emit VoteCast(electionId, msg.sender, nonce);
        
        return true;
    }
    
    // View Functions
    
    /**
     * @dev Get election details
     */
    function getElectionDetails(uint256 electionId) 
        external 
        view 
        electionExists(electionId) 
        returns (
            uint256 id,
            uint8 electionType,
            uint8 status,
            uint256 startTime,
            uint256 endTime,
            uint256 totalVotesCast,
            bool resultsFinalized
        ) 
    {
        Election storage election = elections[electionId];
        return (
            election.id,
            uint8(election.electionType),
            uint8(election.status),
            election.startTime,
            election.endTime,
            election.totalVotesCast,
            election.resultsFinalized
        );
    }
    
    /**
     * @dev Get list of candidates for an election
     */
    function getElectionCandidates(uint256 electionId) 
        external 
        view 
        electionExists(electionId) 
        returns (uint256[] memory) 
    {
        return electionCandidateIds[electionId];
    }
    
    /**
     * @dev Get list of tickets for an election
     */
    function getElectionTickets(uint256 electionId) 
        external 
        view 
        electionExists(electionId) 
        returns (uint256[] memory) 
    {
        return electionTicketIds[electionId];
    }
    
    /**
     * @dev Get candidate vote count
     */
    function getCandidateVoteCount(uint256 candidateId) 
        external 
        view 
        candidateExists(candidateId) 
        returns (uint256) 
    {
        return candidates[candidateId].voteCount;
    }
    
    /**
     * @dev Get ticket vote count
     */
    function getTicketVoteCount(uint256 ticketId) 
        external 
        view 
        ticketExists(ticketId) 
        returns (uint256) 
    {
        return tickets[ticketId].voteCount;
    }
    
    /**
     * @dev Check if an address has voted in an election
     */
    function checkIfVoted(uint256 electionId, address voter) 
        external 
        view 
        electionExists(electionId) 
        returns (bool) 
    {
        return hasVoted[electionId][voter];
    }
    
    /**
     * @dev Get the winner of a finalized election
     */
    function getElectionWinner(uint256 electionId)
        external
        view
        electionExists(electionId)
        returns (uint256 winnerId, uint256 winnerVotes)
    {
        require(
            elections[electionId].resultsFinalized,
            "Election results not yet finalized"
        );
        
        winnerId = electionWinners[electionId];
        
        // Get votes depending on election type
        if (elections[electionId].electionType == ElectionType.Senator) {
            winnerVotes = candidates[winnerId].voteCount;
        } else {
            winnerVotes = tickets[winnerId].voteCount;
        }
        
        return (winnerId, winnerVotes);
    }
}