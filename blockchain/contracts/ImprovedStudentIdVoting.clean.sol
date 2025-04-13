// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

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
 * - Implements role-based access control
 * - Uses keccak256 hashed keys for optimized storage
 * - Enhanced event logging with granular rejection tracking
 */
contract ImprovedStudentIdVoting is AccessControl {
    // Role definitions for fine-grained access control
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ELECTION_MANAGER_ROLE = keccak256("ELECTION_MANAGER_ROLE");
    bytes32 public constant VOTER_MANAGER_ROLE = keccak256("VOTER_MANAGER_ROLE");
    
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
    
    // Additional mappings for student ID lookups (optimized with keccak256 hashes)
    mapping(bytes32 => uint256) private studentIdHashToCandidateId;
    mapping(bytes32 => uint256) private compositeIdHashToTicketId; // hash of presidentId_vpId
    
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
    event VoteRejected(uint256 indexed electionId, address indexed voter, string reason);
    event ResultsFinalized(uint256 indexed electionId, uint256 winnerId, uint256 winnerVotes);
    event TieDetected(uint256 indexed electionId, uint256[] winnerIds, uint256 tiedVoteCount);
    event RoleAccessViolation(address indexed account, bytes32 indexed role, string functionName);
    
    /**
     * @dev Constructor sets up roles and initial admin
     */
    constructor() {
        // Set up the deployer with admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ELECTION_MANAGER_ROLE, msg.sender);
        _grantRole(VOTER_MANAGER_ROLE, msg.sender);
        
        // Register the admin as a voter by default
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
     * @dev Register a new voter - restricted to VOTER_MANAGER_ROLE
     */
    function registerVoter(address voter) external onlyRole(VOTER_MANAGER_ROLE) {
        require(!registeredVoters[voter], "Voter already registered");
        
        registeredVoters[voter] = true;
        emit VoterRegistered(voter);
    }
    
    /**
     * @dev Register multiple voters at once - restricted to VOTER_MANAGER_ROLE
     */
    function registerVotersBatch(address[] calldata voters) external onlyRole(VOTER_MANAGER_ROLE) {
        for (uint256 i = 0; i < voters.length; i++) {
            if (!registeredVoters[voters[i]]) {
                registeredVoters[voters[i]] = true;
                emit VoterRegistered(voters[i]);
            }
        }
    }
    
    /**
     * @dev Deregister a voter - restricted to VOTER_MANAGER_ROLE
     */
    function deregisterVoter(address voter) external onlyRole(VOTER_MANAGER_ROLE) {
        require(registeredVoters[voter], "Voter not registered");
        registeredVoters[voter] = false;
        emit VoterDeregistered(voter);
    }
    
    /**
     * @dev Assign voter manager role to an address - restricted to admins
     */
    function assignVoterManagerRole(address manager) external onlyRole(ADMIN_ROLE) {
        grantRole(VOTER_MANAGER_ROLE, manager);
    }
    
    /**
     * @dev Revoke voter manager role from an address - restricted to admins
     */
    function revokeVoterManagerRole(address manager) external onlyRole(ADMIN_ROLE) {
        revokeRole(VOTER_MANAGER_ROLE, manager);
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
        onlyRole(ELECTION_MANAGER_ROLE)
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
        onlyRole(ELECTION_MANAGER_ROLE)
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
     * @dev Assign election manager role to an address - restricted to admins
     */
    function assignElectionManagerRole(address manager) external onlyRole(ADMIN_ROLE) {
        grantRole(ELECTION_MANAGER_ROLE, manager);
    }
    
    /**
     * @dev Revoke election manager role from an address - restricted to admins
     */
    function revokeElectionManagerRole(address manager) external onlyRole(ADMIN_ROLE) {
        revokeRole(ELECTION_MANAGER_ROLE, manager);
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
     * Enhanced to detect and handle tied elections
     */
    function finalizeResults(uint256 electionId) 
        external 
        onlyRole(ELECTION_MANAGER_ROLE)
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
        
        // Find the winner(s)
        uint256 winnerId = 0;
        uint256 maxVotes = 0;
        
        // Arrays to track potential ties
        uint256[] memory tiedCandidates = new uint256[](50); // Arbitrary max size
        uint256 tieCount = 0;
        
        if (election.electionType == ElectionType.Senator) {
            // Find candidate(s) with most votes
            uint256[] memory candidateIds = electionCandidateIds[electionId];
            
            // First pass: find the maximum vote count
            for (uint256 i = 0; i < candidateIds.length; i++) {
                uint256 candidateId = candidateIds[i];
                uint256 votes = candidates[candidateId].voteCount;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winnerId = candidateId;
                    // Reset tie tracking when a new maximum is found
                    tieCount = 0;
                } else if (votes == maxVotes && maxVotes > 0) {
                    // If equal votes, track as potential tie
                    if (tieCount == 0) {
                        // Add the current leader to the tie list
                        tiedCandidates[tieCount++] = winnerId;
                    }
                    // Add this tied candidate
                    tiedCandidates[tieCount++] = candidateId;
                }
            }
        } else {
            // Find ticket(s) with most votes
            uint256[] memory ticketIds = electionTicketIds[electionId];
            
            // First pass: find the maximum vote count
            for (uint256 i = 0; i < ticketIds.length; i++) {
                uint256 ticketId = ticketIds[i];
                uint256 votes = tickets[ticketId].voteCount;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winnerId = ticketId;
                    // Reset tie tracking when a new maximum is found
                    tieCount = 0;
                } else if (votes == maxVotes && maxVotes > 0) {
                    // If equal votes, track as potential tie
                    if (tieCount == 0) {
                        // Add the current leader to the tie list
                        tiedCandidates[tieCount++] = winnerId;
                    }
                    // Add this tied candidate
                    tiedCandidates[tieCount++] = ticketId;
                }
            }
        }
        
        // Check if there was a tie
        if (tieCount > 0) {
            // Create properly sized array for tied candidates/tickets
            uint256[] memory properTiedCandidates = new uint256[](tieCount);
            for (uint256 i = 0; i < tieCount; i++) {
                properTiedCandidates[i] = tiedCandidates[i];
            }
            
            // Emit tie event - winner will still be set to the first one found
            emit TieDetected(electionId, properTiedCandidates, maxVotes);
            
            // In case of a tie, we select the first one found as the winner
            // This can be refined with additional tie-breaking logic if needed
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
        onlyRole(ELECTION_MANAGER_ROLE)
        returns (uint256) 
    {
        // Validate the student ID
        require(bytes(studentId).length > 0, "Student ID cannot be empty");
        
        // Hash the student ID for efficient storage
        bytes32 studentIdHash = keccak256(abi.encodePacked(studentId));
        
        // Ensure student ID is unique
        require(
            studentIdHashToCandidateId[studentIdHash] == 0,
            "Candidate with this student ID already exists"
        );
        
        uint256 candidateId = nextCandidateId++;
        
        candidates[candidateId] = Candidate({
            id: candidateId,
            studentId: studentId,
            voteCount: 0
        });
        
        // Add student ID hash mapping
        studentIdHashToCandidateId[studentIdHash] = candidateId;
        
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
        bytes32 studentIdHash = keccak256(abi.encodePacked(studentId));
        uint256 candidateId = studentIdHashToCandidateId[studentIdHash];
        require(candidateId != 0, "No candidate found with this student ID");
        return candidateId;
    }
    
    /**
     * @dev Add a candidate to an election
     */
    function addCandidateToElection(uint256 electionId, uint256 candidateId) 
        external 
        onlyRole(ELECTION_MANAGER_ROLE) 
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
        onlyRole(ELECTION_MANAGER_ROLE)
        returns (uint256)
    {
        // Validate student IDs
        require(bytes(presidentStudentId).length > 0, "President student ID cannot be empty");
        require(bytes(vpStudentId).length > 0, "VP student ID cannot be empty");
        require(
            keccak256(abi.encodePacked(presidentStudentId)) != keccak256(abi.encodePacked(vpStudentId)),
            "President and VP must be different"
        );
        
        // Create composite ID hash directly (no need for string concatenation)
        bytes32 compositeIdHash = keccak256(abi.encodePacked(presidentStudentId, "_", vpStudentId));
        
        // Ensure ticket doesn't already exist
        require(
            compositeIdHashToTicketId[compositeIdHash] == 0,
            "Ticket with these student IDs already exists"
        );
        
        uint256 ticketId = nextTicketId++;
        
        tickets[ticketId] = Ticket({
            id: ticketId,
            presidentStudentId: presidentStudentId,
            vpStudentId: vpStudentId,
            voteCount: 0
        });
        
        // Add composite ID hash mapping
        compositeIdHashToTicketId[compositeIdHash] = ticketId;
        
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
        bytes32 compositeIdHash = keccak256(abi.encodePacked(presidentStudentId, "_", vpStudentId));
        uint256 ticketId = compositeIdHashToTicketId[compositeIdHash];
        require(ticketId != 0, "No ticket found with these student IDs");
        return ticketId;
    }
    
    /**
     * @dev Add a ticket to an election
     */
    function addTicketToElection(uint256 electionId, uint256 ticketId)
        external
        onlyRole(ELECTION_MANAGER_ROLE)
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
     * Enhanced with detailed rejection events
     */
    function voteForSenator(uint256 electionId, uint256 candidateId, uint256 nonce) 
        external 
        returns (bool)
    {
        // Check election exists
        if (elections[electionId].id != electionId) {
            emit VoteRejected(electionId, msg.sender, "Election does not exist");
            return false;
        }
        
        // Check election is active
        Election storage election = elections[electionId];
        if (election.status != ElectionStatus.Active) {
            emit VoteRejected(electionId, msg.sender, "Election is not active");
            return false;
        }
        
        // Check time constraints
        if (block.timestamp < election.startTime) {
            emit VoteRejected(electionId, msg.sender, "Election has not started yet");
            return false;
        }
        if (block.timestamp > election.endTime) {
            emit VoteRejected(electionId, msg.sender, "Election has ended");
            return false;
        }
        
        // Check candidate exists
        if (candidates[candidateId].id != candidateId) {
            emit VoteRejected(electionId, msg.sender, "Candidate does not exist");
            return false;
        }
        
        // Check voter hasn't voted
        if (hasVoted[electionId][msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Already voted in this election");
            return false;
        }
        
        // Check voter is registered
        if (!registeredVoters[msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Not a registered voter");
            return false;
        }
        
        // Check nonce
        if (nonce <= voterNonces[msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Invalid nonce - potential replay attack");
            return false;
        }
        
        // Ensure election is of type Senator
        if (elections[electionId].electionType != ElectionType.Senator) {
            emit VoteRejected(electionId, msg.sender, "Election must be of type Senator");
            return false;
        }
        
        // Ensure candidate is part of this election - O(1) lookup
        if (!electionCandidateMap[electionId][candidateId]) {
            emit VoteRejected(electionId, msg.sender, "Candidate is not part of this election");
            return false;
        }
        
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
     * Enhanced with detailed rejection events
     */
    function voteForPresidentVP(uint256 electionId, uint256 ticketId, uint256 nonce) 
        external 
        returns (bool)
    {
        // Check election exists
        if (elections[electionId].id != electionId) {
            emit VoteRejected(electionId, msg.sender, "Election does not exist");
            return false;
        }
        
        // Check election is active
        Election storage election = elections[electionId];
        if (election.status != ElectionStatus.Active) {
            emit VoteRejected(electionId, msg.sender, "Election is not active");
            return false;
        }
        
        // Check time constraints
        if (block.timestamp < election.startTime) {
            emit VoteRejected(electionId, msg.sender, "Election has not started yet");
            return false;
        }
        if (block.timestamp > election.endTime) {
            emit VoteRejected(electionId, msg.sender, "Election has ended");
            return false;
        }
        
        // Check ticket exists
        if (tickets[ticketId].id != ticketId) {
            emit VoteRejected(electionId, msg.sender, "Ticket does not exist");
            return false;
        }
        
        // Check voter hasn't voted
        if (hasVoted[electionId][msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Already voted in this election");
            return false;
        }
        
        // Check voter is registered
        if (!registeredVoters[msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Not a registered voter");
            return false;
        }
        
        // Check nonce
        if (nonce <= voterNonces[msg.sender]) {
            emit VoteRejected(electionId, msg.sender, "Invalid nonce - potential replay attack");
            return false;
        }
        
        // Ensure election is of type PresidentVP
        if (elections[electionId].electionType != ElectionType.PresidentVP) {
            emit VoteRejected(electionId, msg.sender, "Election must be of type PresidentVP");
            return false;
        }
        
        // Ensure ticket is part of this election - O(1) lookup
        if (!electionTicketMap[electionId][ticketId]) {
            emit VoteRejected(electionId, msg.sender, "Ticket is not part of this election");
            return false;
        }
        
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
     * @dev Check if an address has voted in a specific election
     */
    function checkIfVoted(uint256 electionId, address voter) 
        external 
        view 
        returns (bool) 
    {
        return hasVoted[electionId][voter];
    }
    
    /**
     * @dev Get vote count for a candidate
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
     * @dev Get vote count for a ticket
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
     * @dev Get winner of a finalized election
     */
    function getElectionWinner(uint256 electionId) 
        external 
        view 
        electionExists(electionId)
        returns (uint256, bool) 
    {
        bool isFinalized = elections[electionId].resultsFinalized;
        if (!isFinalized) {
            return (0, false);
        }
        return (electionWinners[electionId], true);
    }
    
    /**
     * @dev Get all candidates in an election
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
     * @dev Get all tickets in an election
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
     * @dev Get detailed information about an election
     */
    function getElectionDetails(uint256 electionId) 
        external 
        view 
        electionExists(electionId)
        returns (
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
            uint8(election.electionType),
            uint8(election.status),
            election.startTime,
            election.endTime,
            election.totalVotesCast,
            election.resultsFinalized
        );
    }
    
    // Required override from AccessControl for easier frontend integration
    function hasRole(bytes32 role, address account) public view override returns (bool) {
        return super.hasRole(role, account);
    }
    
    /**
     * @dev Check all predefined roles for an address at once
     * Useful for UI to determine which features to show
     */
    function checkRoles(address account) external view returns (bool isAdmin, bool isElectionManager, bool isVoterManager) {
        isAdmin = hasRole(ADMIN_ROLE, account);
        isElectionManager = hasRole(ELECTION_MANAGER_ROLE, account);
        isVoterManager = hasRole(VOTER_MANAGER_ROLE, account);
    }
    
    /**
     * @dev Get role constants to use in frontend
     */
    function getRoleConstants() external pure returns (bytes32 adminRole, bytes32 electionManagerRole, bytes32 voterManagerRole) {
        adminRole = ADMIN_ROLE;
        electionManagerRole = ELECTION_MANAGER_ROLE;
        voterManagerRole = VOTER_MANAGER_ROLE;
    }
    
    /**
     * @dev Manage multiple roles at once - more efficient than individual role assignments
     * @param user The address to manage roles for
     * @param isAdmin Whether the user should have the ADMIN_ROLE
     * @param isElectionManager Whether the user should have the ELECTION_MANAGER_ROLE
     * @param isVoterManager Whether the user should have the VOTER_MANAGER_ROLE
     */
    function manageRoles(
        address user, 
        bool isAdmin, 
        bool isElectionManager, 
        bool isVoterManager
    ) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        // Update admin role
        if (isAdmin && !hasRole(ADMIN_ROLE, user)) {
            grantRole(ADMIN_ROLE, user);
        } else if (!isAdmin && hasRole(ADMIN_ROLE, user)) {
            revokeRole(ADMIN_ROLE, user);
        }
        
        // Update election manager role
        if (isElectionManager && !hasRole(ELECTION_MANAGER_ROLE, user)) {
            grantRole(ELECTION_MANAGER_ROLE, user);
        } else if (!isElectionManager && hasRole(ELECTION_MANAGER_ROLE, user)) {
            revokeRole(ELECTION_MANAGER_ROLE, user);
        }
        
        // Update voter manager role
        if (isVoterManager && !hasRole(VOTER_MANAGER_ROLE, user)) {
            grantRole(VOTER_MANAGER_ROLE, user);
        } else if (!isVoterManager && hasRole(VOTER_MANAGER_ROLE, user)) {
            revokeRole(VOTER_MANAGER_ROLE, user);
        }
    }
}