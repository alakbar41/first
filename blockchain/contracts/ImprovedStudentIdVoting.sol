// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ImprovedStudentIdVoting
 * @dev An enhanced smart contract for university voting that uses student IDs 
 * for stable candidate identification across Web2 and Web3 systems
 * 
 * Key features:
 * - Uses student IDs for stable candidate identification
 * - Uses timestamp-based election identification
 * - Supports concurrent elections with individual tracking
 * - Implements time-bound automatic status updates
 * - Protects against replay attacks with nonces
 */
contract ImprovedStudentIdVoting is Ownable {
    
    // Election types - kept simple for reference
    enum ElectionType { Senator, PresidentVP }
    
    // Election statuses
    enum ElectionStatus { Pending, Active, Completed, Cancelled }
    
    // Improved Election structure with time bounds as the primary identifier
    struct Election {
        uint256 id;
        ElectionType electionType;
        ElectionStatus status;
        uint256 startTime;      // Primary identifier for Web2-Web3 mapping
        uint256 endTime;
        uint256 totalVotesCast;
        bool resultsFinalized;
    }
    
    // Enhanced candidate structure with student ID for stable identification
    struct Candidate {
        uint256 id;             // Internal blockchain ID
        string studentId;       // Student ID for stable identification across systems
        uint256 voteCount;
    }
    
    // Enhanced ticket structure with composite IDs for president/VP pairs
    struct Ticket {
        uint256 id;             // Internal blockchain ID
        string presidentStudentId;  // President's student ID
        string vpStudentId;         // VP's student ID
        uint256 voteCount;
    }
    
    // Storage variables
    uint256 private nextElectionId = 1;
    uint256 private nextCandidateId = 1;
    uint256 private nextTicketId = 1;
    uint256 private nextNonce = 1;   // For preventing replay attacks
    
    // Main data structures
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => Ticket) public tickets;
    
    // Additional mappings for student ID lookups
    mapping(string => uint256) private studentIdToCandidateId;
    mapping(string => uint256) private compositeIdToTicketId; // presidentId_vpId format
    
    // Improved relations between entities
    mapping(uint256 => mapping(uint256 => bool)) private electionCandidateMap;  // electionId => candidateId => exists
    mapping(uint256 => mapping(uint256 => bool)) private electionTicketMap;     // electionId => ticketId => exists
    mapping(uint256 => uint256[]) private electionCandidateIds;  // For enumeration
    mapping(uint256 => uint256[]) private electionTicketIds;     // For enumeration
    
    // Voter management
    mapping(uint256 => mapping(address => bool)) private hasVoted;     // electionId => voter => hasVoted
    mapping(address => bool) public registeredVoters;                 // Voter authentication
    mapping(address => uint256) private voterNonces;                  // Prevent replay attacks
    
    // Election results tracking
    mapping(uint256 => uint256) private electionWinners;        // electionId => winningCandidateId/ticketId
    
    // Events
    event ElectionCreated(uint256 indexed electionId, uint8 electionType, uint256 startTime, uint256 endTime);
    event ElectionStatusChanged(uint256 indexed electionId, uint8 status);
    event VoterRegistered(address indexed voter);
    event VoterDeregistered(address indexed voter);
    event CandidateRegistered(uint256 indexed candidateId, string studentId);
    event TicketCreated(uint256 indexed ticketId, string presidentStudentId, string vpStudentId);
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
     * @dev Deregister a voter
     */
    function deregisterVoter(address voter) external onlyOwner {
        require(registeredVoters[voter], "Voter not registered");
        registeredVoters[voter] = false;
        emit VoterDeregistered(voter);
    }
    
    /**
     * @dev Check if an address is a registered voter - directly exposed for easier integration
     */
    function isRegisteredVoter(address voter) external view returns (bool) {
        return registeredVoters[voter];
    }
    
    /**
     * @dev Get the next nonce for a voter
     */
    function getNextNonce() external view returns (uint256) {
        return voterNonces[msg.sender] + 1;
    }
    
    // Election Management Functions
    
    /**
     * @dev Create a new election with time bounds (used as stable identifier)
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
     * @dev Register a new candidate with student ID
     */
    function registerCandidate(string calldata studentId) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        // Validate the student ID
        require(bytes(studentId).length > 0, "Student ID cannot be empty");
        
        // Ensure student ID is unique
        require(
            studentIdToCandidateId[studentId] == 0,
            "Candidate with this student ID already exists"
        );
        
        uint256 candidateId = nextCandidateId++;
        
        candidates[candidateId] = Candidate({
            id: candidateId,
            studentId: studentId,
            voteCount: 0
        });
        
        // Add student ID mapping
        studentIdToCandidateId[studentId] = candidateId;
        
        emit CandidateRegistered(candidateId, studentId);
        
        return candidateId;
    }
    
    /**
     * @dev Get candidate ID by student ID
     */
    function getCandidateIdByStudentId(string calldata studentId) 
        external 
        view 
        returns (uint256) 
    {
        uint256 candidateId = studentIdToCandidateId[studentId];
        require(candidateId != 0, "No candidate found with this student ID");
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
     * @dev Create a President/VP ticket with student IDs
     */
    function createTicket(
        string calldata presidentStudentId, 
        string calldata vpStudentId
    ) 
        external 
        onlyOwner 
        returns (uint256)
    {
        // Validate student IDs
        require(bytes(presidentStudentId).length > 0, "President student ID cannot be empty");
        require(bytes(vpStudentId).length > 0, "VP student ID cannot be empty");
        require(
            keccak256(abi.encodePacked(presidentStudentId)) != keccak256(abi.encodePacked(vpStudentId)),
            "President and VP must be different"
        );
        
        // Create composite ID
        string memory compositeId = string(abi.encodePacked(presidentStudentId, "_", vpStudentId));
        
        // Ensure ticket doesn't already exist
        require(
            compositeIdToTicketId[compositeId] == 0,
            "Ticket with these student IDs already exists"
        );
        
        uint256 ticketId = nextTicketId++;
        
        tickets[ticketId] = Ticket({
            id: ticketId,
            presidentStudentId: presidentStudentId,
            vpStudentId: vpStudentId,
            voteCount: 0
        });
        
        // Add composite ID mapping
        compositeIdToTicketId[compositeId] = ticketId;
        
        emit TicketCreated(ticketId, presidentStudentId, vpStudentId);
        
        return ticketId;
    }
    
    /**
     * @dev Get ticket ID by president and VP student IDs
     */
    function getTicketIdByStudentIds(
        string calldata presidentStudentId, 
        string calldata vpStudentId
    ) 
        external 
        view 
        returns (uint256) 
    {
        string memory compositeId = string(abi.encodePacked(presidentStudentId, "_", vpStudentId));
        uint256 ticketId = compositeIdToTicketId[compositeId];
        require(ticketId != 0, "No ticket found with these student IDs");
        return ticketId;
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
    
    // Getter functions
    
    /**
     * @dev Check if a voter has voted in an election
     */
    function checkIfVoted(uint256 electionId, address voter) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[electionId][voter];
    }
    
    /**
     * @dev Get a candidate's vote count
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
     * @dev Get a ticket's vote count
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
     * @dev Get the winner of an election
     */
    function getElectionWinner(uint256 electionId) 
        external 
        view 
        electionExists(electionId)
        returns (uint256) 
    {
        require(
            elections[electionId].resultsFinalized,
            "Results not finalized yet"
        );
        return electionWinners[electionId];
    }
    
    /**
     * @dev Get the list of candidates in an election
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
     * @dev Get the list of tickets in an election
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
     * @dev Get details about an election
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
}