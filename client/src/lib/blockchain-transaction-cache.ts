/**
 * Blockchain Transaction Cache
 * 
 * This module provides a way to track and cache blockchain transactions
 * to prevent duplicate transactions from being sent when the page refreshes
 */

// Type for blockchain transaction record
export interface BlockchainTransaction {
  id: string;        // Unique ID for this transaction (e.g., "deploy-election-5")
  type: string;      // Type of transaction (e.g., "deploy", "activate", "register-candidate")
  electionId: number; // Database election ID 
  blockchainId?: number; // Blockchain election ID if available
  timestamp: number;  // When the transaction was completed
  completed: boolean; // Whether the transaction is completed
  status: 'pending' | 'success' | 'failed'; // Status of the transaction
}

// Storage key for localStorage
const STORAGE_KEY = 'blockchain_transactions';

/**
 * Get all cached transactions from localStorage
 */
export function getCachedTransactions(): BlockchainTransaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    console.log('Raw blockchain transaction cache data:', data);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('Parsed blockchain transactions:', parsed);
      return parsed;
    }
  } catch (error) {
    console.error('Failed to parse cached transactions:', error);
  }
  console.log('No blockchain transactions found in cache');
  return [];
}

/**
 * Save transactions to localStorage
 */
function saveTransactions(transactions: BlockchainTransaction[]): void {
  try {
    console.log('Saving transactions to cache:', transactions);
    const dataToSave = JSON.stringify(transactions);
    console.log('Stringified data to save:', dataToSave);
    localStorage.setItem(STORAGE_KEY, dataToSave);
    
    // Verify data was saved correctly
    const savedData = localStorage.getItem(STORAGE_KEY);
    console.log('Verification - Data saved to localStorage:', savedData);
  } catch (error) {
    console.error('Failed to save transactions to cache:', error);
  }
}

/**
 * Record a completed transaction
 */
export function recordTransaction(transaction: Omit<BlockchainTransaction, 'timestamp' | 'status'> & { status?: 'pending' | 'success' | 'failed' }): void {
  console.log(`Recording transaction to cache: ${transaction.id} (election: ${transaction.electionId}, type: ${transaction.type})`);
  
  const transactions = getCachedTransactions();
  
  // Check if transaction already exists
  const existingIndex = transactions.findIndex(t => t.id === transaction.id);
  console.log(`Transaction ${transaction.id} exists in cache: ${existingIndex >= 0}`);
  
  const fullTransaction: BlockchainTransaction = {
    ...transaction,
    timestamp: Date.now(),
    status: transaction.status || 'success'
  };
  
  if (existingIndex >= 0) {
    // Update existing transaction
    console.log(`Updating existing transaction in cache: ${transaction.id}`);
    transactions[existingIndex] = {
      ...transactions[existingIndex],
      ...fullTransaction
    };
  } else {
    // Add new transaction
    console.log(`Adding new transaction to cache: ${transaction.id}`);
    transactions.push(fullTransaction);
  }
  
  // Save updated transactions
  saveTransactions(transactions);
  
  // Verify the transaction was saved correctly
  setTimeout(() => {
    const saved = isTransactionCompleted(transaction.id);
    console.log(`Verification - Transaction ${transaction.id} saved correctly: ${saved}`);
  }, 100);
}

/**
 * Check if a transaction has already been completed
 */
export function isTransactionCompleted(id: string): boolean {
  const transactions = getCachedTransactions();
  console.log(`Checking transaction completion for ID: ${id}`);
  console.log(`Current cached transactions:`, transactions);
  
  const transaction = transactions.find(t => t.id === id);
  
  const isCompleted = !!transaction && transaction.completed && transaction.status === 'success';
  console.log(`Transaction ${id} completed status:`, isCompleted);
  
  return isCompleted;
}

/**
 * Clear transaction cache for testing or reset purposes
 */
export function clearTransactionCache(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Clear transactions older than a certain time (in days)
 */
export function clearOldTransactions(days: number = 7): void {
  const transactions = getCachedTransactions();
  const now = Date.now();
  const cutoff = now - (days * 24 * 60 * 60 * 1000);
  
  const filteredTransactions = transactions.filter(t => t.timestamp >= cutoff);
  
  if (filteredTransactions.length !== transactions.length) {
    saveTransactions(filteredTransactions);
  }
}