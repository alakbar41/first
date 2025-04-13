# Blockchain ID Mapping System

## Overview

The ADA University Voting System uses a dual-database approach:
1. Web2 Database (PostgreSQL): Stores user-friendly data with sequential IDs
2. Web3 Blockchain (Polygon Amoy): Stores immutable voting records with different ID schemes

A fundamental challenge in this system is mapping between these two different ID systems:

### Web2 Database IDs
- **Elections**: Sequential integers (1, 2, 3...)
- **Candidates**: Sequential integers (1, 2, 3...)
- **Tickets**: Sequential integers (1, 2, 3...)

### Web3 Blockchain IDs
- **Elections**: Timestamps or unique integers (1661234567...)
- **Candidates**: IDs linked to student IDs (not sequential)
- **Tickets**: IDs created for president/VP pairs (not sequential)

## The ID Mapping Challenge

When a user votes for a candidate in election #5, we must:
1. Determine which blockchain election ID corresponds to database election #5
2. Determine which blockchain candidate ID corresponds to database candidate #3
3. Record the vote on blockchain with these translated IDs

## Solution: Enhanced Blockchain ID Mapping

We've implemented an enhanced mapping system that:

1. **Adds blockchain ID fields** to database tables:
   - `elections.blockchainId`
   - `candidates.blockchainId`
   - `tickets.blockchainId`

2. **Provides mapping functions** in `enhanced-blockchain-id-mapping.ts`:
   - `mapElectionFromWeb2ToWeb3`: Maps database election ID to blockchain ID
   - `mapCandidateFromWeb2ToWeb3`: Maps database candidate ID to blockchain ID
   - `mapElectionFromWeb3ToWeb2`: Maps blockchain election ID to database ID
   - `mapCandidateFromWeb3ToWeb2`: Maps blockchain candidate ID to database ID

3. **Uses student IDs as stable identifiers** for candidates:
   - Candidates are registered on blockchain with their student IDs
   - Student IDs serve as stable identifiers across both systems

4. **Adds API endpoints** to update blockchain IDs:
   - `PATCH /api/elections/:id/blockchain-id`
   - `PATCH /api/candidates/:id/blockchain-id`

5. **Provides a Blockchain Sync Button** in the admin interface:
   - Registers candidates on blockchain using student IDs
   - Creates elections on blockchain
   - Registers candidates for elections
   - Updates database records with blockchain IDs

## How to Use

1. **Register Candidates**: First register candidates with their student IDs in the database
2. **Create Elections**: Create elections in the database
3. **Add Candidates to Elections**: Add candidates to their respective elections
4. **Sync with Blockchain**: Use the Improved Blockchain Sync Button to:
   - Register candidates on blockchain
   - Create elections on blockchain
   - Register candidates for elections
   - Update database with blockchain IDs
5. **Enable Voting**: Once synced, voting can proceed with proper ID translation

## Architecture Benefits

This ID mapping system provides several benefits:
- **Resilience to Database Changes**: Database IDs can change without breaking blockchain integration
- **Student ID as Stable Identifier**: Student IDs provide a consistent reference across systems
- **Improved Error Handling**: Clear error messages if mapping fails
- **Admin Interface Integration**: Easy synchronization through the admin interface
- **Bidirectional Mapping**: Support for both database-to-blockchain and blockchain-to-database mapping