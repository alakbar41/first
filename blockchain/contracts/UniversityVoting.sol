// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UniversityVoting
 * @dev A secure, gas-optimized voting system for university elections supporting both individual candidates and tickets.
 * Features:
 * - Immutable owner & admin roles
 * - Prevention of duplicate candidates/tickets
 * - Nonce-based voting to prevent replay attacks
 * - Tie detection and handling
 * - Human-readable student IDs
 * - Comprehensive event logging
 */
contract UniversityVoting {
    address public immutable owner;
    address public admin1;
    address public admin2;

    modifier onlyAdmin() {
        require(
            msg.sender == owner || msg.sender == admin1 || msg.sender == admin2,
            "Not an admin"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Custom errors (cheaper than require strings)
    error AlreadyVoted();
    error InvalidNonce();
    error ElectionNotActive();
    error CandidateNotFound();
    error TicketNotFound();
    error InvalidTimes();
    error ElectionExists();
    error ElectionNotEnded();
    error AlreadyFinalized();
    error InvalidAdminAddress();
    error InvalidAdminSlot();

    enum ElectionStatus { Pending, Active, Completed }

    struct Election {
        uint64 startTime;
        uint64 endTime;
        ElectionStatus status;
        bool resultsFinalized;
        uint32 totalVotesCast;
        bytes32 descriptionHash; // Optional: Store IPFS hash for election details
    }

    struct Candidate {
        bytes32 studentIdHash;
        uint32 voteCount;
    }

    struct Ticket {
        bytes32 presIdHash;
        bytes32 vpIdHash;
        uint32 voteCount;
    }

    // Storage mappings
    mapping(uint256 => Election) public elections;
    mapping(uint256 => mapping(bytes32 => Candidate)) public electionCandidates;
    mapping(uint256 => mapping(bytes32 => Ticket)) public electionTickets;
    mapping(uint256 => bytes32[]) public candidateHashes;
    mapping(uint256 => bytes32[]) public ticketHashes;
    mapping(uint256 => bytes32[]) public tiedCandidates;
    mapping(uint256 => bytes32[]) public tiedTickets;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => mapping(uint256 => uint256)) public voterNonces;
    mapping(uint256 => bytes32) public electionWinnerCandidate;
    mapping(uint256 => bytes32) public electionWinnerTicket;
    mapping(bytes32 => string) public studentIdToString;

    // Events
    event ElectionCreated(uint256 indexed startTime, uint256 endTime, bytes32 descriptionHash);
    event CandidateAdded(uint256 indexed startTime, bytes32 studentIdHash);
    event TicketAdded(uint256 indexed startTime, bytes32 presHash, bytes32 vpHash);
    event VoteCast(uint256 indexed startTime, address voter, uint256 nonce);
    event AdminAssigned(uint8 indexed adminSlot, address admin);
    event AdminRemoved(uint8 indexed adminSlot, address admin);
    event ElectionFinalized(uint256 indexed startTime, bytes32 winnerId);
    event TieDetected(uint256 indexed startTime, uint256 maxVotes, uint256 count);
    event NoVotesDetected(uint256 indexed startTime);

    constructor() {
        owner = msg.sender;
    }

    // ========== ADMIN MANAGEMENT ========== //

    function setAdmin1(address _admin) external onlyOwner {
        if (_admin == address(0)) revert InvalidAdminAddress();
        admin1 = _admin;
        emit AdminAssigned(1, _admin);
    }

    function setAdmin2(address _admin) external onlyOwner {
        if (_admin == address(0)) revert InvalidAdminAddress();
        admin2 = _admin;
        emit AdminAssigned(2, _admin);
    }

    function removeAdmin(uint8 adminSlot) external onlyOwner {
        if (adminSlot != 1 && adminSlot != 2) revert InvalidAdminSlot();
        address removedAdmin = adminSlot == 1 ? admin1 : admin2;
        if (adminSlot == 1) admin1 = address(0);
        if (adminSlot == 2) admin2 = address(0);
        emit AdminRemoved(adminSlot, removedAdmin);
    }

    // ========== ELECTION MANAGEMENT ========== //

    function createElectionWithCandidates(
        uint256 startTime,
        uint256 endTime,
        bool isTicketBased,
        bytes32[] calldata candidateIds,
        string[] calldata candidateStrings,
        bytes32[][] calldata ticketPairs,
        string[][] calldata ticketStrings,
        bytes32 descriptionHash
    ) external onlyAdmin {
        // Input validation
        if (startTime <= block.timestamp || endTime <= startTime) revert InvalidTimes();
        if (elections[startTime].startTime != 0) revert ElectionExists();
        require(candidateIds.length == candidateStrings.length, "Mismatched candidate arrays");
        require(ticketPairs.length == ticketStrings.length, "Mismatched ticket arrays");

        // Create election
        elections[startTime] = Election({
            startTime: uint64(startTime),
            endTime: uint64(endTime),
            status: ElectionStatus.Pending,
            resultsFinalized: false,
            totalVotesCast: 0,
            descriptionHash: descriptionHash
        });

        emit ElectionCreated(startTime, endTime, descriptionHash);

        if (isTicketBased) {
            for (uint i = 0; i < ticketPairs.length; i++) {
                bytes32 pres = ticketPairs[i][0];
                bytes32 vp = ticketPairs[i][1];

                require(pres != vp, "President and VP must be different");
                bytes32 ticketHash = keccak256(abi.encodePacked(pres, "_", vp));
                require(electionTickets[startTime][ticketHash].presIdHash == bytes32(0), "Duplicate ticket");

                electionTickets[startTime][ticketHash] = Ticket(pres, vp, 0);
                ticketHashes[startTime].push(ticketHash);
                studentIdToString[pres] = ticketStrings[i][0];
                studentIdToString[vp] = ticketStrings[i][1];

                emit TicketAdded(startTime, pres, vp);
            }
        } else {
            for (uint i = 0; i < candidateIds.length; i++) {
                bytes32 id = candidateIds[i];
                require(electionCandidates[startTime][id].studentIdHash == bytes32(0), "Duplicate candidate");

                electionCandidates[startTime][id] = Candidate(id, 0);
                candidateHashes[startTime].push(id);
                studentIdToString[id] = candidateStrings[i];

                emit CandidateAdded(startTime, id);
            }
        }
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

    // ========== VOTING FUNCTIONS ========== //

    function voteForCandidate(uint256 startTime, bytes32 studentIdHash, uint256 nonce) external {
        updateElectionStatus(startTime);
        Election storage election = elections[startTime];

        if (election.status != ElectionStatus.Active) revert ElectionNotActive();
        if (hasVoted[startTime][msg.sender]) revert AlreadyVoted();
        if (nonce <= voterNonces[msg.sender][startTime]) revert InvalidNonce();

        Candidate storage candidate = electionCandidates[startTime][studentIdHash];
        if (candidate.studentIdHash == bytes32(0)) revert CandidateNotFound();

        candidate.voteCount++;
        election.totalVotesCast++;
        hasVoted[startTime][msg.sender] = true;
        voterNonces[msg.sender][startTime] = nonce;

        emit VoteCast(startTime, msg.sender, nonce);
    }

    function voteForTicket(uint256 startTime, bytes32 presHash, bytes32 vpHash, uint256 nonce) external {
        updateElectionStatus(startTime);
        Election storage election = elections[startTime];

        if (election.status != ElectionStatus.Active) revert ElectionNotActive();
        if (hasVoted[startTime][msg.sender]) revert AlreadyVoted();
        if (nonce <= voterNonces[msg.sender][startTime]) revert InvalidNonce();

        bytes32 hash = keccak256(abi.encodePacked(presHash, "_", vpHash));
        Ticket storage ticket = electionTickets[startTime][hash];
        if (ticket.presIdHash == bytes32(0)) revert TicketNotFound();

        ticket.voteCount++;
        election.totalVotesCast++;
        hasVoted[startTime][msg.sender] = true;
        voterNonces[msg.sender][startTime] = nonce;

        emit VoteCast(startTime, msg.sender, nonce);
    }

    // ========== RESULTS FINALIZATION ========== //

    function finalizeResults(uint256 startTime, bool isTicketBased) external onlyAdmin {
        Election storage election = elections[startTime];
        if (block.timestamp <= election.endTime + 1 hours) revert ElectionNotEnded();
        if (election.resultsFinalized) revert AlreadyFinalized();

        bytes32 winnerId;
        uint256 maxVotes = 0;

        bytes32[] storage hashes = isTicketBased ? ticketHashes[startTime] : candidateHashes[startTime];

        // Clear previous tied entries
        if (isTicketBased) {
            delete tiedTickets[startTime];
        } else {
            delete tiedCandidates[startTime];
        }

        for (uint i = 0; i < hashes.length; i++) {
            uint256 votes = isTicketBased 
                ? electionTickets[startTime][hashes[i]].voteCount 
                : electionCandidates[startTime][hashes[i]].voteCount;

            if (votes > maxVotes) {
                maxVotes = votes;
                winnerId = hashes[i];

                // Reset tied arrays for new max vote
                if (isTicketBased) {
                    delete tiedTickets[startTime];
                    tiedTickets[startTime].push(hashes[i]);
                } else {
                    delete tiedCandidates[startTime];
                    tiedCandidates[startTime].push(hashes[i]);
                }
            } else if (votes == maxVotes && maxVotes > 0) {
                if (isTicketBased) {
                    tiedTickets[startTime].push(hashes[i]);
                } else {
                    tiedCandidates[startTime].push(hashes[i]);
                }
            }
        }

        if (maxVotes == 0) {
            emit NoVotesDetected(startTime);
            election.resultsFinalized = true;
            return;
        }

        // Check for tie (multiple candidates/tickets with max votes)
        if ((isTicketBased && tiedTickets[startTime].length > 1) || 
            (!isTicketBased && tiedCandidates[startTime].length > 1)) {
            emit TieDetected(
                startTime, 
                maxVotes, 
                isTicketBased ? tiedTickets[startTime].length : tiedCandidates[startTime].length
            );
            return;
        }

        // No tie - set winner
        if (isTicketBased) {
            electionWinnerTicket[startTime] = winnerId;
        } else {
            electionWinnerCandidate[startTime] = winnerId;
        }

        election.resultsFinalized = true;
        emit ElectionFinalized(startTime, winnerId);
    }

    // ========== VIEW FUNCTIONS ========== //

    function isTied(uint256 startTime, bool isTicketBased) external view returns (bool) {
        return isTicketBased 
            ? tiedTickets[startTime].length > 1 
            : tiedCandidates[startTime].length > 1;
    }

    function getWinnerCandidate(uint256 startTime) external view returns (string memory) {
        return studentIdToString[electionWinnerCandidate[startTime]];
    }

    function getWinnerTicket(uint256 startTime) external view returns (string memory, string memory) {
        Ticket memory t = electionTickets[startTime][electionWinnerTicket[startTime]];
        return (studentIdToString[t.presIdHash], studentIdToString[t.vpIdHash]);
    }

    function getTiedCandidates(uint256 startTime) external view returns (string[] memory) {
        bytes32[] memory hashes = tiedCandidates[startTime];
        string[] memory names = new string[](hashes.length);
        for (uint i = 0; i < hashes.length; i++) {
            names[i] = studentIdToString[hashes[i]];
        }
        return names;
    }

    function getTiedTickets(uint256 startTime) external view returns (string[][] memory) {
        bytes32[] memory hashes = tiedTickets[startTime];
        string[][] memory result = new string[][](hashes.length);
        for (uint i = 0; i < hashes.length; i++) {
            Ticket memory t = electionTickets[startTime][hashes[i]];
            string[] memory pair = new string[](2);
            pair[0] = studentIdToString[t.presIdHash];
            pair[1] = studentIdToString[t.vpIdHash];
            result[i] = pair;
        }
        return result;
    }

    function getAllCandidates(uint256 startTime) external view returns (string[] memory, uint256[] memory) {
        bytes32[] memory hashes = candidateHashes[startTime];
        string[] memory names = new string[](hashes.length);
        uint256[] memory votes = new uint256[](hashes.length);
        for (uint i = 0; i < hashes.length; i++) {
            names[i] = studentIdToString[hashes[i]];
            votes[i] = electionCandidates[startTime][hashes[i]].voteCount;
        }
        return (names, votes);
    }

    function getAllTickets(uint256 startTime) external view returns (string[][] memory, uint256[] memory) {
        bytes32[] memory hashes = ticketHashes[startTime];
        string[][] memory pairs = new string[][](hashes.length);
        uint256[] memory votes = new uint256[](hashes.length);

        for (uint i = 0; i < hashes.length; i++) {
            Ticket storage t = electionTickets[startTime][hashes[i]];
            string[] memory pair = new string[](2);
            pair[0] = studentIdToString[t.presIdHash];
            pair[1] = studentIdToString[t.vpIdHash];
            pairs[i] = pair;
            votes[i] = t.voteCount;
        }

        return (pairs, votes);
    }

    function hasUserVoted(uint256 startTime, address user) external view returns (bool) {
        return hasVoted[startTime][user];
    }

    function getAdmins() external view returns (address, address, address) {
        return (owner, admin1, admin2);
    }
}