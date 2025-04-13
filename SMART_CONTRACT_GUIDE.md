# Smart Contract Deployment Guide

This guide walks you through deploying and interacting with the improved student ID-based voting smart contract for the ADA University Voting System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Contract Overview](#contract-overview)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Contract Integration](#contract-integration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js and npm installed
- MetaMask wallet installed and set up with Polygon Amoy testnet
- Some Amoy test MATIC in your wallet
- Hardhat development environment (included in this project)

## Contract Overview

The `ImprovedStudentIdVoting.sol` contract introduces several significant improvements over the original contract:

- **Student ID-based candidate mapping**: Uses student IDs as stable identifiers instead of numeric IDs
- **Timestamp-based election mapping**: Uses election start timestamps as stable identifiers
- **Improved error handling**: Better error messages and validation
- **Enhanced security**: Uses nonces to prevent replay attacks
- **Voter management**: Supports voter registration and deregistration
- **Automated status updates**: Can update election status based on time

## Environment Setup

1. Create a `.env` file in the project root with the following variables:

```
# Deployment Account Private Key (required for deployment only)
PRIVATE_KEY=your_wallet_private_key_here

# RPC URLs (used for deployment and development)
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# SmartContract Address (after deployment)
VITE_NEW_CONTRACT_ADDRESS=the_deployed_contract_address
```

## Deployment Process

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the contract:
   ```bash
   npx hardhat compile
   ```

3. Deploy to Polygon Amoy testnet:
   ```bash
   npx hardhat run blockchain/scripts/deploy-student-id.js --network amoy
   ```
   
4. After deployment, copy the contract address and update your `.env` file:
   ```
   VITE_NEW_CONTRACT_ADDRESS=0x... # Your deployed contract address
   ```

## Contract Integration

The new contract requires some specific integration points:

### 1. Initializing Web3 Connection

```typescript
import studentIdWeb3Service from '@/lib/student-id-web3-service';
await studentIdWeb3Service.initialize();
```

### 2. Registering a Candidate with Student ID

```typescript
// Register candidate with student ID
const candidateId = await studentIdWeb3Service.registerCandidate("STU12345");
```

### 3. Creating a President/VP Ticket with Student IDs

```typescript
// Create ticket with student IDs
const ticketId = await studentIdWeb3Service.createTicket("STU12345", "STU67890");
```

### 4. ID Mapping Between Web2 and Web3 Systems

```typescript
import { mapCandidateFromWeb2ToWeb3 } from '@/lib/enhanced-blockchain-id-mapping';

// Map database ID to blockchain ID
const blockchainCandidateId = await mapCandidateFromWeb2ToWeb3(databaseCandidateId);
```

### 5. Voting for a Candidate or Ticket

```typescript
// Vote for a senator
await studentIdWeb3Service.voteForSenator(electionId, candidateId);

// Vote for a president/VP ticket
await studentIdWeb3Service.voteForPresidentVP(electionId, ticketId);
```

## Troubleshooting

### Common Issues

1. **MetaMask not detected**
   - Ensure MetaMask extension is installed and unlocked
   - Refresh the page after unlocking MetaMask

2. **Transaction Error: Gas estimation failed**
   - The contract function might be reverting
   - Check parameters and contract state
   - Look for detailed error messages in browser console

3. **Invalid election or candidate ID**
   - Ensure IDs are being properly mapped between Web2 and Web3 systems
   - Check if student IDs match between systems

4. **Vote Already Cast**
   - Each address can only vote once per election
   - Use a different account or reset voting status (admin only)

### When to Redeploy

You need to redeploy the contract in these situations:

1. Changes to the contract code
2. If the contract becomes unusable due to a critical bug
3. When moving to a different blockchain network

### Contact for Support

If you encounter any issues with the smart contract integration, please contact:
- Email: univoteapp@gmail.com