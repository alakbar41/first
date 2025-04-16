// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UniversityVoting {
    address public owner;
    address public admin1;
    address public admin2;

    modifier onlyAdmin() {
        require(msg.sender == owner || msg.sender == admin1 || msg.sender == admin2, "Not an admin");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAdmin1(address _admin) external onlyAdmin {
        admin1 = _admin;
        emit AdminAssigned(1, _admin);
    }

    function setAdmin2(address _admin) external onlyAdmin {
        admin2 = _admin;
        emit AdminAssigned(2, _admin);
    }

    enum ElectionStatus { Pending, Active, Completed }

    struct Election {
        uint256 startTime;
        uint256 endTime;
        ElectionStatus status;
        bool resultsFinalized;
        uint256 totalVotesCast;
    }

    struct Candidate {
        string studentId;
        uint256 voteCount;
    }

    struct Ticket {
        string presidentStudentId;
        string vpStudentId;
        uint256 voteCount;
    }

    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(bytes32 => Candidate)) public electionCandidates;
    mapping(uint256 => mapping(bytes32 => Ticket)) public electionTickets;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => mapping(uint256 => uint256)) public voterNonces;
    mapping(uint256 => string) public electionWinnerCandidate;
    mapping(uint256 => string) public electionWinnerTicket;

    event ElectionCreated(uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 startTime, string studentId);
    event TicketAdded(uint256 startTime, string presidentId, string vpId);
    event VoteCast(uint256 startTime, address voter, uint256 nonce);
    event VoteRejected(uint256 startTime, address voter, string reason);
    event AdminAssigned(uint8 adminSlot, address admin);
    event ElectionFinalized(uint256 startTime, string winnerId);

    function createElection(uint256 startTime, uint256 endTime) external onlyAdmin {
        require(endTime > startTime, "End time must be after start time");
        require(elections[startTime].startTime == 0, "Election with this start time already exists");

        elections[startTime] = Election({
            startTime: startTime,
            endTime: endTime,
            status: ElectionStatus.Pending,
            resultsFinalized: false,
            totalVotesCast: 0
        });

        emit ElectionCreated(startTime, endTime);
    }

    function addCandidate(uint256 startTime, string calldata studentId) external onlyAdmin {
        require(elections[startTime].startTime != 0, "Election does not exist");
        bytes32 hash = keccak256(abi.encodePacked(studentId));
        require(bytes(electionCandidates[startTime][hash].studentId).length == 0, "Candidate already added");

        electionCandidates[startTime][hash] = Candidate(studentId, 0);
        emit CandidateAdded(startTime, studentId);
    }

    function addTicket(uint256 startTime, string calldata presidentId, string calldata vpId) external onlyAdmin {
        require(elections[startTime].startTime != 0, "Election does not exist");
        require(keccak256(abi.encodePacked(presidentId)) != keccak256(abi.encodePacked(vpId)), "President and VP must be different");

        bytes32 hash = keccak256(abi.encodePacked(presidentId, "_", vpId));
        require(bytes(electionTickets[startTime][hash].presidentStudentId).length == 0, "Ticket already added");

        electionTickets[startTime][hash] = Ticket(presidentId, vpId, 0);
        emit TicketAdded(startTime, presidentId, vpId);
    }

    function updateElectionStatus(uint256 startTime) public {
        Election storage election = elections[startTime];
        if (election.status == ElectionStatus.Completed) return;

        if (block.timestamp >= election.startTime && block.timestamp <= election.endTime) {
            election.status = ElectionStatus.Active;
        } else if (block.timestamp > election.endTime) {
            election.status = ElectionStatus.Completed;
        }
    }

    function voteForCandidate(uint256 startTime, string calldata studentId, uint256 nonce) external {
        updateElectionStatus(startTime);
        Election storage election = elections[startTime];
        if (election.status != ElectionStatus.Active) {
            emit VoteRejected(startTime, msg.sender, "Election not active");
            return;
        }
        if (hasVoted[startTime][msg.sender]) {
            emit VoteRejected(startTime, msg.sender, "Already voted");
            return;
        }
        if (nonce <= voterNonces[msg.sender][startTime]) {
            emit VoteRejected(startTime, msg.sender, "Invalid nonce");
            return;
        }

        bytes32 hash = keccak256(abi.encodePacked(studentId));
        Candidate storage candidate = electionCandidates[startTime][hash];
        if (bytes(candidate.studentId).length == 0) {
            emit VoteRejected(startTime, msg.sender, "Candidate not found");
            return;
        }

        candidate.voteCount++;
        election.totalVotesCast++;
        hasVoted[startTime][msg.sender] = true;
        voterNonces[msg.sender][startTime] = nonce;

        emit VoteCast(startTime, msg.sender, nonce);
    }

    function voteForTicket(uint256 startTime, string calldata presidentId, string calldata vpId, uint256 nonce) external {
        updateElectionStatus(startTime);
        Election storage election = elections[startTime];
        if (election.status != ElectionStatus.Active) {
            emit VoteRejected(startTime, msg.sender, "Election not active");
            return;
        }
        if (hasVoted[startTime][msg.sender]) {
            emit VoteRejected(startTime, msg.sender, "Already voted");
            return;
        }
        if (nonce <= voterNonces[msg.sender][startTime]) {
            emit VoteRejected(startTime, msg.sender, "Invalid nonce");
            return;
        }

        bytes32 hash = keccak256(abi.encodePacked(presidentId, "_", vpId));
        Ticket storage ticket = electionTickets[startTime][hash];
        if (bytes(ticket.presidentStudentId).length == 0) {
            emit VoteRejected(startTime, msg.sender, "Ticket not found");
            return;
        }

        ticket.voteCount++;
        election.totalVotesCast++;
        hasVoted[startTime][msg.sender] = true;
        voterNonces[msg.sender][startTime] = nonce;

        emit VoteCast(startTime, msg.sender, nonce);
    }

    function finalizeResults(uint256 startTime, bool isTicketBased) external onlyAdmin {
        Election storage election = elections[startTime];
        require(block.timestamp > election.endTime, "Election has not ended yet");
        require(!election.resultsFinalized, "Already finalized");

        string memory winnerId = "";
        uint256 maxVotes = 0;

        if (isTicketBased) {
            for (uint256 i = 0; i < 100; i++) {
                bytes32 hash = keccak256(abi.encodePacked(i));
                Ticket storage ticket = electionTickets[startTime][hash];
                if (bytes(ticket.presidentStudentId).length == 0) break;
                if (ticket.voteCount > maxVotes) {
                    maxVotes = ticket.voteCount;
                    winnerId = string(abi.encodePacked(ticket.presidentStudentId, "_", ticket.vpStudentId));
                }
            }
            electionWinnerTicket[startTime] = winnerId;
        } else {
            for (uint256 i = 0; i < 100; i++) {
                bytes32 hash = keccak256(abi.encodePacked(i));
                Candidate storage candidate = electionCandidates[startTime][hash];
                if (bytes(candidate.studentId).length == 0) break;
                if (candidate.voteCount > maxVotes) {
                    maxVotes = candidate.voteCount;
                    winnerId = candidate.studentId;
                }
            }
            electionWinnerCandidate[startTime] = winnerId;
        }

        election.resultsFinalized = true;
        emit ElectionFinalized(startTime, winnerId);
    }

    function getWinnerCandidate(uint256 startTime) external view returns (string memory) {
        return electionWinnerCandidate[startTime];
    }

    function getWinnerTicket(uint256 startTime) external view returns (string memory) {
        return electionWinnerTicket[startTime];
    }

    function getCandidateVotes(uint256 startTime, string calldata studentId) external view returns (uint256) {
        bytes32 hash = keccak256(abi.encodePacked(studentId));
        return electionCandidates[startTime][hash].voteCount;
    }

    function getTicketVotes(uint256 startTime, string calldata presidentId, string calldata vpId) external view returns (uint256) {
        bytes32 hash = keccak256(abi.encodePacked(presidentId, "_", vpId));
        return electionTickets[startTime][hash].voteCount;
    }

    function hasUserVoted(uint256 startTime, address user) external view returns (bool) {
        return hasVoted[startTime][user];
    }

    function getAdmins() external view returns (address, address, address) {
        return (owner, admin1, admin2);
    }
}