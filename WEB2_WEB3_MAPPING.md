# Web2-Web3 Data Mapping in ADA University Voting System

This document explains how data is mapped between our traditional web application database (Web2) and the blockchain smart contract (Web3).

## Key Identifiers and Mapping

### Elections

#### Database (Web2)
- `id`: Auto-incrementing primary key in the database
- `position`: Text field ("President", "Vice President", or "Senator")
- `startDate`: DateTime object for the start of the election
- `endDate`: DateTime object for the end of the election
- `blockchainId`: Integer field that stores the Unix timestamp of `startDate` used as the election identifier in the blockchain

#### Smart Contract (Web3)
- `startTime`: A Unix timestamp (seconds since epoch) used as the primary key for elections
- `position`: An enum `PositionType { Senator, PresidentVP }` where `0 = Senator` and `1 = PresidentVP`
- `endTime`: A Unix timestamp (seconds since epoch) for the end of the election

#### Mapping Process
1. When creating an election for the blockchain:
   - Our database position is mapped to the contract position enum using the `mapPositionToBlockchain()` function
   - JavaScript Date objects are converted to Unix timestamps (seconds) with `Math.floor(date.getTime() / 1000)`
   - The start timestamp is stored in the database's `blockchainId` field for future reference
   - The contract uses this timestamp as the key to access the election

### Candidates

#### Database (Web2)
- `id`: Auto-incrementing primary key
- `studentId`: String containing the student's ID number (e.g., "000012345")
- `blockchainHash`: String field that stores the bytes32 hash of the studentId used for blockchain identification

#### Smart Contract (Web3)
- `id`: A bytes32 hash used as the candidate identifier
- The mapping between candidates and elections is maintained by the election struct in the contract

#### Mapping Process
1. When adding a candidate to a blockchain election:
   - The student ID is hashed using keccak256 to produce a bytes32 value
   - This hash is stored in the database's `blockchainHash` field for future reference
   - The hash is used as the candidate identifier in all blockchain transactions

## Data Type Conversions

### Position Type
- Database: Stores as string "President", "Vice President", or "Senator"
- Blockchain: Uses enum where `0 = Senator` and `1 = PresidentVP`
- Conversion: `mapPositionToBlockchain()` function in `shared/schema.ts`
  ```typescript
  export function mapPositionToBlockchain(position: string): number {
    if (position === "Senator") {
      return 0; // Senator enum value
    } else {
      return 1; // PresidentVP enum value (for both President and Vice President)
    }
  }
  ```

### Student ID
- Database: Stores raw student ID as string (e.g., "000012345")
- Blockchain: Uses bytes32 hash of the student ID
- Conversion: `studentIdToBytes32()` function in `server/blockchain.ts`
  ```typescript
  export function studentIdToBytes32(studentId: string): string {
    // Use keccak256 hash with ethers.js v6
    const bytes32Hash = ethers.keccak256(ethers.toUtf8Bytes(studentId));
    return bytes32Hash;
  }
  ```

### Date/Time
- Database: Stores as JavaScript Date objects
- Blockchain: Uses Unix timestamps (seconds since epoch)
- Conversion:
  ```typescript
  const unixTimestamp = Math.floor(dateObject.getTime() / 1000);
  ```

## Use of Identifiers in Transactions

### Creating an Election
1. Generate Unix timestamp from the start date
2. Map database position to blockchain enum value
3. Hash all candidate student IDs to bytes32 format
4. Store hashes in the candidates table for future reference
5. Store start timestamp in the election's `blockchainId` field
6. Use this data for the client-side MetaMask transaction

### Casting a Vote
1. Look up the election's blockchain ID (timestamp) from the database
2. Look up the candidate's blockchain hash from the database
3. Use these values in the transaction parameters for the vote function

### Retrieving Election Results
1. Query blockchain using the election's stored blockchain ID (timestamp)
2. Receive hashed candidate IDs and vote counts
3. Map hashed IDs back to student IDs using stored values in database

## In-Memory and Database Storage

For fast lookups, the system maintains:
1. An in-memory map of hashed student IDs to original student IDs
2. Database storage of these mappings for persistence between server restarts

## Important Notes

- The blockchain contract serves as the single source of truth for vote counts
- The database remains the source of truth for candidate details and election metadata
- Blockchain operations are performed client-side via MetaMask for security
- The web server only prepares the transaction data and stores mapping information