// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AdaUniversityVoting
 * @dev Smart contract for managing university elections on blockchain
 */
contract AdaUniversityVoting is Ownable {
    using Strings for uint256;
    
    // Election types
    enum ElectionType { Senator, PresidentVP }
    
    // Election statuses
    enum ElectionStatus { Pending, Active, Completed, Cancelled }
    
    // Election structure
    struct Election {
        uint256 id;
        string name;
        ElectionType electionType;
        ElectionStatus status;
        uint256 startTime;
        uint256 endTime;
        string eligibleFaculties; // Comma-separated faculty codes
        uint256 totalVotesCast;
        bool resultsFinalized;
    }
    
    // Candidate structure
    struct Candidate {
        uint256 id;
        string studentId;
        string faculty;
        uint256 voteCount;
    }
    
    // President/VP ticket structure
    struct PresidentVPTicket {
        uint256 ticketId;
        uint256 presidentId; // References candidateId
        uint256 vpId;        // References candidateId
        uint256 voteCount;
    }
    
    // Storage variables
    uint256 private nextElectionId = 1;
    uint256 private nextCandidateId = 1;
    uint256 private nextTicketId = 1;
    
    // Main data structures
    mapping(uint256 => Election) public elections;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => PresidentVPTicket) public presidentVPTickets;
    
    // Relations between entities
    mapping(uint256 => uint256[]) private electionCandidates; // electionId => candidateIds
    mapping(uint256 => uint256[]) private electionTickets; // electionId => ticketIds
    mapping(uint256 => mapping(address => bool)) private hasVoted; // electionId => voter => hasVoted
    
    // Events
    event ElectionCreated(uint256 indexed electionId, string name, uint8 electionType);
    event ElectionStatusChanged(uint256 indexed electionId, uint8 status);
    event CandidateRegistered(uint256 indexed candidateId, string studentId, string faculty);
    event TicketCreated(uint256 indexed ticketId, uint256 presidentId, uint256 vpId);
    event VoteCast(uint256 indexed electionId, address indexed voter);
    event ResultsFinalized(uint256 indexed electionId);
    
    /**
     * @dev Constructor sets contract deployer as the owner
     */
    constructor() Ownable(msg.sender) {}
    
    // Modifiers
    
    /**
     * @dev Ensures an election exists
     */
    modifier electionExists(uint256 electionId) {
        require(elections[electionId].id == electionId, "Election does not exist");
        _;
    }
    
    /**
     * @dev Ensures an election is active
     */
    modifier electionActive(uint256 electionId) {
        require(
            elections[electionId].status == ElectionStatus.Active,
            "Election is not active"
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
        require(presidentVPTickets[ticketId].ticketId == ticketId, "Ticket does not exist");
        _;
    }
    
    // Election Management Functions
    
    /**
     * @dev Create a new election
     */
    function createElection(
        string memory name,
        uint8 electionType,
        uint256 startTime,
        uint256 endTime,
        string memory eligibleFaculties
    ) external onlyOwner returns (uint256) {
        require(startTime < endTime, "End time must be after start time");
        require(endTime > block.timestamp, "End time must be in the future");
        
        uint256 electionId = nextElectionId++;
        
        elections[electionId] = Election({
            id: electionId,
            name: name,
            electionType: ElectionType(electionType),
            status: ElectionStatus.Pending,
            startTime: startTime,
            endTime: endTime,
            eligibleFaculties: eligibleFaculties,
            totalVotesCast: 0,
            resultsFinalized: false
        });
        
        emit ElectionCreated(electionId, name, electionType);
        
        return electionId;
    }
    
    /**
     * @dev Update an election's status
     */
    function updateElectionStatus(uint256 electionId, uint8 status) 
        external 
        onlyOwner 
        electionExists(electionId) 
    {
        elections[electionId].status = ElectionStatus(status);
        emit ElectionStatusChanged(electionId, status);
    }
    
    /**
     * @dev Finalize the results of an election
     */
    function finalizeResults(uint256 electionId) 
        external 
        onlyOwner 
        electionExists(electionId)
        resultsNotFinalized(electionId)
    {
        // Ensure election is completed
        require(
            elections[electionId].status == ElectionStatus.Completed,
            "Election must be completed to finalize results"
        );
        
        elections[electionId].resultsFinalized = true;
        emit ResultsFinalized(electionId);
    }
    
    // Candidate Management Functions
    
    /**
     * @dev Register a new candidate
     */
    function registerCandidate(
        string memory studentId,
        string memory faculty
    ) external onlyOwner returns (uint256) {
        uint256 candidateId = nextCandidateId++;
        
        candidates[candidateId] = Candidate({
            id: candidateId,
            studentId: studentId,
            faculty: faculty,
            voteCount: 0
        });
        
        emit CandidateRegistered(candidateId, studentId, faculty);
        
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
        
        // Add candidate to election
        electionCandidates[electionId].push(candidateId);
    }
    
    /**
     * @dev Create a President/VP ticket
     */
    function createPresidentVPTicket(
        uint256 electionId,
        uint256 presidentId,
        uint256 vpId
    ) 
        external 
        onlyOwner 
        electionExists(electionId)
        candidateExists(presidentId)
        candidateExists(vpId)
    {
        // Ensure election is of type PresidentVP
        require(
            elections[electionId].electionType == ElectionType.PresidentVP,
            "Election must be of type PresidentVP"
        );
        
        // Ensure election is not active or completed
        require(
            elections[electionId].status == ElectionStatus.Pending,
            "Cannot create tickets for active or completed elections"
        );
        
        // Ensure president and VP are different candidates
        require(presidentId != vpId, "President and VP must be different candidates");
        
        uint256 ticketId = nextTicketId++;
        
        presidentVPTickets[ticketId] = PresidentVPTicket({
            ticketId: ticketId,
            presidentId: presidentId,
            vpId: vpId,
            voteCount: 0
        });
        
        // Add ticket to election
        electionTickets[electionId].push(ticketId);
        
        emit TicketCreated(ticketId, presidentId, vpId);
    }
    
    // Voting Functions
    
    /**
     * @dev Vote for a senator candidate
     */
    function voteForSenator(uint256 electionId, uint256 candidateId) 
        external 
        electionExists(electionId)
        electionActive(electionId)
        candidateExists(candidateId)
        hasNotVoted(electionId)
        returns (bool)
    {
        // Ensure election is of type Senator
        require(
            elections[electionId].electionType == ElectionType.Senator,
            "Election must be of type Senator"
        );
        
        // Ensure candidate is part of this election
        bool isCandidateInElection = false;
        uint256[] memory candidateIds = electionCandidates[electionId];
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidateIds[i] == candidateId) {
                isCandidateInElection = true;
                break;
            }
        }
        require(isCandidateInElection, "Candidate is not part of this election");
        
        // Record the vote
        candidates[candidateId].voteCount++;
        
        // Mark voter as having voted
        hasVoted[electionId][msg.sender] = true;
        
        // Update total votes
        elections[electionId].totalVotesCast++;
        
        emit VoteCast(electionId, msg.sender);
        
        return true;
    }
    
    /**
     * @dev Vote for a President/VP ticket
     */
    function voteForPresidentVP(uint256 electionId, uint256 ticketId) 
        external 
        electionExists(electionId)
        electionActive(electionId)
        ticketExists(ticketId)
        hasNotVoted(electionId)
        returns (bool)
    {
        // Ensure election is of type PresidentVP
        require(
            elections[electionId].electionType == ElectionType.PresidentVP,
            "Election must be of type PresidentVP"
        );
        
        // Ensure ticket is part of this election
        bool isTicketInElection = false;
        uint256[] memory ticketIds = electionTickets[electionId];
        for (uint256 i = 0; i < ticketIds.length; i++) {
            if (ticketIds[i] == ticketId) {
                isTicketInElection = true;
                break;
            }
        }
        require(isTicketInElection, "Ticket is not part of this election");
        
        // Record the vote
        presidentVPTickets[ticketId].voteCount++;
        
        // Mark voter as having voted
        hasVoted[electionId][msg.sender] = true;
        
        // Update total votes
        elections[electionId].totalVotesCast++;
        
        emit VoteCast(electionId, msg.sender);
        
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
            string memory name,
            uint8 electionType,
            uint8 status,
            uint256 startTime,
            uint256 endTime,
            string memory eligibleFaculties,
            uint256 totalVotesCast,
            bool resultsFinalized
        ) 
    {
        Election storage election = elections[electionId];
        return (
            election.id,
            election.name,
            uint8(election.electionType),
            uint8(election.status),
            election.startTime,
            election.endTime,
            election.eligibleFaculties,
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
        return electionCandidates[electionId];
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
        return electionTickets[electionId];
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
        return presidentVPTickets[ticketId].voteCount;
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
}