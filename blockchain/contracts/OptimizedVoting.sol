// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OptimizedVoting
 * @dev A gas-optimized smart contract for managing university voting
 * that only stores essential voting data on the blockchain
 */
contract OptimizedVoting is Ownable {
    
    // Election types - kept simple for reference
    enum ElectionType { Senator, PresidentVP }
    
    // Election statuses
    enum ElectionStatus { Pending, Active, Completed, Cancelled }
    
    // Optimized Election structure - only essential data
    struct Election {
        uint256 id;
        ElectionType electionType;
        ElectionStatus status;
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
    
    // Main data structures
    mapping(uint256 => Election) public elections;
    mapping(uint256 => VoteCounter) public candidates;
    mapping(uint256 => VoteCounter) public tickets;
    
    // Relations between entities
    mapping(uint256 => uint256[]) private electionCandidates; // electionId => candidateIds
    mapping(uint256 => uint256[]) private electionTickets; // electionId => ticketIds
    mapping(uint256 => mapping(address => bool)) private hasVoted; // electionId => voter => hasVoted
    
    // Events
    event ElectionCreated(uint256 indexed electionId, uint8 electionType);
    event ElectionStatusChanged(uint256 indexed electionId, uint8 status);
    event CandidateRegistered(uint256 indexed candidateId);
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
        require(tickets[ticketId].id == ticketId, "Ticket does not exist");
        _;
    }
    
    // Election Management Functions
    
    /**
     * @dev Create a new election with minimal data storage
     */
    function createElection(uint8 electionType) external onlyOwner returns (uint256) {
        uint256 electionId = nextElectionId++;
        
        elections[electionId] = Election({
            id: electionId,
            electionType: ElectionType(electionType),
            status: ElectionStatus.Pending,
            totalVotesCast: 0,
            resultsFinalized: false
        });
        
        emit ElectionCreated(electionId, electionType);
        
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
        
        // Add candidate to election
        electionCandidates[electionId].push(candidateId);
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
        
        // Add ticket to election
        electionTickets[electionId].push(ticketId);
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
        tickets[ticketId].voteCount++;
        
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
            uint8 electionType,
            uint8 status,
            uint256 totalVotesCast,
            bool resultsFinalized
        ) 
    {
        Election storage election = elections[electionId];
        return (
            election.id,
            uint8(election.electionType),
            uint8(election.status),
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
}