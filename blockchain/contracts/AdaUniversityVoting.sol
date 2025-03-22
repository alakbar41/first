// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AdaUniversityVoting
 * @dev Smart contract for the ADA University Voting System
 * Handles both Senator elections and President/VP elections
 */
contract AdaUniversityVoting is Ownable, ReentrancyGuard, Pausable {
    // Enums
    enum ElectionType { Senator, PresidentVP }
    enum ElectionStatus { Pending, Active, Completed, Cancelled }

    // Structs
    struct Election {
        uint256 id;
        string name;
        ElectionType electionType;
        ElectionStatus status;
        uint256 startTime;
        uint256 endTime;
        string eligibleFaculties; // Comma-separated list of faculty codes
        uint256 totalVotesCast;
        bool resultsFinalized;
    }

    struct Candidate {
        uint256 id;
        string studentId;
        string faculty;
        uint256 voteCount;
    }

    struct PresidentVPTicket {
        uint256 ticketId;     // Generated hash of president and VP IDs
        uint256 presidentId;
        uint256 vpId;
        uint256 voteCount;
    }

    // Storage
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => PresidentVPTicket) public presidentVPTickets;
    
    // Mapping from election ID to candidate IDs in that election
    mapping(uint256 => uint256[]) public electionCandidates;
    
    // Mapping from election ID to president/VP tickets in that election
    mapping(uint256 => uint256[]) public electionTickets;
    
    // Mapping to track if a voter has participated in an election
    // election ID => voter address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Election counter
    uint256 public electionCount;
    
    // Candidate counter
    uint256 public candidateCount;
    
    // Ticket counter
    uint256 public ticketCount;
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string name, ElectionType electionType);
    event ElectionStatusChanged(uint256 indexed electionId, ElectionStatus status);
    event CandidateAdded(uint256 indexed candidateId, string studentId, string faculty);
    event CandidateAddedToElection(uint256 indexed electionId, uint256 indexed candidateId);
    event TicketCreated(uint256 indexed ticketId, uint256 presidentId, uint256 vpId);
    event TicketAddedToElection(uint256 indexed electionId, uint256 indexed ticketId);
    event VoteCast(uint256 indexed electionId, address indexed voter);
    event ElectionResultsFinalized(uint256 indexed electionId);

    /**
     * @dev Constructor sets the contract owner
     */
    constructor() Ownable(msg.sender) {
        // Initialize counters
        electionCount = 0;
        candidateCount = 0;
        ticketCount = 0;
    }

    /**
     * @dev Modifier to check if an election exists
     * @param _electionId The ID of the election
     */
    modifier electionExists(uint256 _electionId) {
        require(_electionId > 0 && _electionId <= electionCount, "Election does not exist");
        _;
    }

    /**
     * @dev Modifier to check if an election is active
     * @param _electionId The ID of the election
     */
    modifier electionIsActive(uint256 _electionId) {
        require(elections[_electionId].status == ElectionStatus.Active, "Election is not active");
        require(block.timestamp >= elections[_electionId].startTime, "Election has not started yet");
        require(block.timestamp <= elections[_electionId].endTime, "Election has ended");
        _;
    }

    /**
     * @dev Modifier to check if a candidate exists
     * @param _candidateId The ID of the candidate
     */
    modifier candidateExists(uint256 _candidateId) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Candidate does not exist");
        _;
    }

    /**
     * @dev Modifier to check if a ticket exists
     * @param _ticketId The ID of the ticket
     */
    modifier ticketExists(uint256 _ticketId) {
        require(_ticketId > 0 && _ticketId <= ticketCount, "Ticket does not exist");
        _;
    }

    /**
     * @dev Modifier to check if a voter has already voted in an election
     * @param _electionId The ID of the election
     */
    modifier hasNotVoted(uint256 _electionId) {
        require(!hasVoted[_electionId][msg.sender], "You have already voted in this election");
        _;
    }

    /**
     * @dev Create a new election
     * @param _name Name of the election
     * @param _electionType Type of the election (Senator or PresidentVP)
     * @param _startTime Start time of the election (unix timestamp)
     * @param _endTime End time of the election (unix timestamp)
     * @param _eligibleFaculties Comma-separated list of eligible faculty codes
     * @return The ID of the newly created election
     */
    function createElection(
        string memory _name,
        ElectionType _electionType,
        uint256 _startTime,
        uint256 _endTime,
        string memory _eligibleFaculties
    ) public onlyOwner whenNotPaused returns (uint256) {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        
        electionCount++;
        
        elections[electionCount] = Election({
            id: electionCount,
            name: _name,
            electionType: _electionType,
            status: ElectionStatus.Pending,
            startTime: _startTime,
            endTime: _endTime,
            eligibleFaculties: _eligibleFaculties,
            totalVotesCast: 0,
            resultsFinalized: false
        });
        
        emit ElectionCreated(electionCount, _name, _electionType);
        
        return electionCount;
    }

    /**
     * @dev Update the status of an election
     * @param _electionId The ID of the election
     * @param _status The new status to set
     */
    function updateElectionStatus(uint256 _electionId, ElectionStatus _status) 
        public 
        onlyOwner 
        electionExists(_electionId) 
        whenNotPaused 
    {
        require(_status != elections[_electionId].status, "New status must be different");
        
        // If finalizing, make sure election has ended
        if (_status == ElectionStatus.Completed) {
            require(block.timestamp > elections[_electionId].endTime, "Election has not ended yet");
        }
        
        elections[_electionId].status = _status;
        
        emit ElectionStatusChanged(_electionId, _status);
    }

    /**
     * @dev Add a new candidate
     * @param _studentId University student ID of the candidate
     * @param _faculty Faculty code of the candidate
     * @return The ID of the newly created candidate
     */
    function addCandidate(string memory _studentId, string memory _faculty) 
        public 
        onlyOwner 
        whenNotPaused 
        returns (uint256) 
    {
        candidateCount++;
        
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            studentId: _studentId,
            faculty: _faculty,
            voteCount: 0
        });
        
        emit CandidateAdded(candidateCount, _studentId, _faculty);
        
        return candidateCount;
    }

    /**
     * @dev Add a candidate to an election
     * @param _electionId The ID of the election
     * @param _candidateId The ID of the candidate
     */
    function addCandidateToElection(uint256 _electionId, uint256 _candidateId) 
        public 
        onlyOwner 
        electionExists(_electionId) 
        candidateExists(_candidateId) 
        whenNotPaused 
    {
        // Check if election is still in Pending or Active status
        require(
            elections[_electionId].status == ElectionStatus.Pending || 
            elections[_electionId].status == ElectionStatus.Active, 
            "Election must be pending or active"
        );
        
        // Check if candidate is already in this election
        bool candidateAlreadyAdded = false;
        for (uint i = 0; i < electionCandidates[_electionId].length; i++) {
            if (electionCandidates[_electionId][i] == _candidateId) {
                candidateAlreadyAdded = true;
                break;
            }
        }
        require(!candidateAlreadyAdded, "Candidate already added to this election");
        
        // Add candidate to the election
        electionCandidates[_electionId].push(_candidateId);
        
        emit CandidateAddedToElection(_electionId, _candidateId);
    }

    /**
     * @dev Create a President/VP ticket
     * @param _presidentId The ID of the President candidate
     * @param _vpId The ID of the Vice President candidate
     * @return The ID of the newly created ticket
     */
    function createPresidentVPTicket(uint256 _presidentId, uint256 _vpId) 
        public 
        onlyOwner 
        candidateExists(_presidentId) 
        candidateExists(_vpId) 
        whenNotPaused 
        returns (uint256) 
    {
        require(_presidentId != _vpId, "President and VP cannot be the same person");
        
        ticketCount++;
        
        // Generate a unique ticket ID based on the two candidate IDs
        uint256 uniqueTicketId = uint256(keccak256(abi.encodePacked(_presidentId, _vpId)));
        
        presidentVPTickets[ticketCount] = PresidentVPTicket({
            ticketId: uniqueTicketId,
            presidentId: _presidentId,
            vpId: _vpId,
            voteCount: 0
        });
        
        emit TicketCreated(ticketCount, _presidentId, _vpId);
        
        return ticketCount;
    }

    /**
     * @dev Add a President/VP ticket to an election
     * @param _electionId The ID of the election
     * @param _ticketId The ID of the ticket
     */
    function addTicketToElection(uint256 _electionId, uint256 _ticketId) 
        public 
        onlyOwner 
        electionExists(_electionId) 
        ticketExists(_ticketId)
        whenNotPaused 
    {
        // Ensure election is of type PresidentVP
        require(
            elections[_electionId].electionType == ElectionType.PresidentVP, 
            "Election must be of type PresidentVP"
        );
        
        // Check if election is still in Pending or Active status
        require(
            elections[_electionId].status == ElectionStatus.Pending || 
            elections[_electionId].status == ElectionStatus.Active, 
            "Election must be pending or active"
        );
        
        // Check if ticket is already in this election
        bool ticketAlreadyAdded = false;
        for (uint i = 0; i < electionTickets[_electionId].length; i++) {
            if (electionTickets[_electionId][i] == _ticketId) {
                ticketAlreadyAdded = true;
                break;
            }
        }
        require(!ticketAlreadyAdded, "Ticket already added to this election");
        
        // Add ticket to the election
        electionTickets[_electionId].push(_ticketId);
        
        emit TicketAddedToElection(_electionId, _ticketId);
    }

    /**
     * @dev Cast a vote for a candidate in a Senator election
     * @param _electionId The ID of the election
     * @param _candidateId The ID of the candidate
     */
    function voteForSenator(uint256 _electionId, uint256 _candidateId) 
        public 
        electionExists(_electionId)
        candidateExists(_candidateId)
        electionIsActive(_electionId)
        hasNotVoted(_electionId)
        whenNotPaused
        nonReentrant
    {
        // Ensure election is of type Senator
        require(
            elections[_electionId].electionType == ElectionType.Senator, 
            "Election must be of type Senator"
        );
        
        // Ensure candidate is part of this election
        bool candidateInElection = false;
        for (uint i = 0; i < electionCandidates[_electionId].length; i++) {
            if (electionCandidates[_electionId][i] == _candidateId) {
                candidateInElection = true;
                break;
            }
        }
        require(candidateInElection, "Candidate is not part of this election");
        
        // Record the vote
        candidates[_candidateId].voteCount++;
        elections[_electionId].totalVotesCast++;
        
        // Mark voter as having voted in this election
        hasVoted[_electionId][msg.sender] = true;
        
        emit VoteCast(_electionId, msg.sender);
    }

    /**
     * @dev Cast a vote for a President/VP ticket
     * @param _electionId The ID of the election
     * @param _ticketId The ID of the ticket
     */
    function voteForPresidentVP(uint256 _electionId, uint256 _ticketId) 
        public 
        electionExists(_electionId)
        ticketExists(_ticketId)
        electionIsActive(_electionId)
        hasNotVoted(_electionId)
        whenNotPaused
        nonReentrant
    {
        // Ensure election is of type PresidentVP
        require(
            elections[_electionId].electionType == ElectionType.PresidentVP, 
            "Election must be of type PresidentVP"
        );
        
        // Ensure ticket is part of this election
        bool ticketInElection = false;
        for (uint i = 0; i < electionTickets[_electionId].length; i++) {
            if (electionTickets[_electionId][i] == _ticketId) {
                ticketInElection = true;
                break;
            }
        }
        require(ticketInElection, "Ticket is not part of this election");
        
        // Record the vote
        presidentVPTickets[_ticketId].voteCount++;
        elections[_electionId].totalVotesCast++;
        
        // Mark voter as having voted in this election
        hasVoted[_electionId][msg.sender] = true;
        
        emit VoteCast(_electionId, msg.sender);
    }

    /**
     * @dev Finalize the results of an election
     * @param _electionId The ID of the election
     */
    function finalizeElectionResults(uint256 _electionId) 
        public 
        onlyOwner 
        electionExists(_electionId) 
        whenNotPaused 
    {
        // Ensure election has ended
        require(block.timestamp > elections[_electionId].endTime, "Election has not ended yet");
        
        // Ensure election is in active or completed status
        require(
            elections[_electionId].status == ElectionStatus.Active || 
            elections[_electionId].status == ElectionStatus.Completed, 
            "Election must be active or completed"
        );
        
        // Ensure results haven't already been finalized
        require(!elections[_electionId].resultsFinalized, "Results already finalized");
        
        // Set election status to completed if it's not already
        if (elections[_electionId].status != ElectionStatus.Completed) {
            elections[_electionId].status = ElectionStatus.Completed;
            emit ElectionStatusChanged(_electionId, ElectionStatus.Completed);
        }
        
        // Mark results as finalized
        elections[_electionId].resultsFinalized = true;
        
        emit ElectionResultsFinalized(_electionId);
    }

    /**
     * @dev Get candidates for a specific election
     * @param _electionId The ID of the election
     * @return Array of candidate IDs
     */
    function getElectionCandidates(uint256 _electionId) 
        public 
        view 
        electionExists(_electionId) 
        returns (uint256[] memory) 
    {
        return electionCandidates[_electionId];
    }

    /**
     * @dev Get tickets for a specific election
     * @param _electionId The ID of the election
     * @return Array of ticket IDs
     */
    function getElectionTickets(uint256 _electionId) 
        public 
        view 
        electionExists(_electionId) 
        returns (uint256[] memory) 
    {
        return electionTickets[_electionId];
    }

    /**
     * @dev Get vote count for a specific candidate
     * @param _candidateId The ID of the candidate
     * @return Number of votes
     */
    function getCandidateVoteCount(uint256 _candidateId) 
        public 
        view 
        candidateExists(_candidateId) 
        returns (uint256) 
    {
        return candidates[_candidateId].voteCount;
    }

    /**
     * @dev Get vote count for a specific ticket
     * @param _ticketId The ID of the ticket
     * @return Number of votes
     */
    function getTicketVoteCount(uint256 _ticketId) 
        public 
        view 
        ticketExists(_ticketId) 
        returns (uint256) 
    {
        return presidentVPTickets[_ticketId].voteCount;
    }

    /**
     * @dev Get the details of an election
     * @param _electionId The ID of the election
     * @return id ID of the election
     * @return name Name of the election
     * @return electionType Type of the election
     * @return status Status of the election
     * @return startTime Start time of the election
     * @return endTime End time of the election
     * @return eligibleFaculties Eligible faculties for the election
     * @return totalVotesCast Total votes cast in the election
     * @return resultsFinalized Whether results have been finalized
     */
    function getElectionDetails(uint256 _electionId) 
        public 
        view 
        electionExists(_electionId) 
        returns (
            uint256 id,
            string memory name,
            ElectionType electionType,
            ElectionStatus status,
            uint256 startTime,
            uint256 endTime,
            string memory eligibleFaculties,
            uint256 totalVotesCast,
            bool resultsFinalized
        ) 
    {
        Election memory election = elections[_electionId];
        return (
            election.id,
            election.name,
            election.electionType,
            election.status,
            election.startTime,
            election.endTime,
            election.eligibleFaculties,
            election.totalVotesCast,
            election.resultsFinalized
        );
    }

    /**
     * @dev Check if a voter has already voted in an election
     * @param _electionId The ID of the election
     * @param _voter The address of the voter
     * @return Whether the voter has voted
     */
    function checkIfVoted(uint256 _electionId, address _voter) 
        public 
        view 
        electionExists(_electionId) 
        returns (bool) 
    {
        return hasVoted[_electionId][_voter];
    }

    /**
     * @dev Pause the contract
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}