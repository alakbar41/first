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
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to parse cached transactions:', error);
  }
  return [];
}

/**
 * Save transactions to localStorage
 */
function saveTransactions(transactions: BlockchainTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions to cache:', error);
  }
}

/**
 * Record a completed transaction
 */
export function recordTransaction(transaction: Omit<BlockchainTransaction, 'timestamp' | 'status'> & { status?: 'pending' | 'success' | 'failed' }): void {
  const transactions = getCachedTransactions();
  
  // Check if transaction already exists
  const existingIndex = transactions.findIndex(t => t.id === transaction.id);
  
  const fullTransaction: BlockchainTransaction = {
    ...transaction,
    timestamp: Date.now(),
    status: transaction.status || 'success'
  };
  
  if (existingIndex >= 0) {
    // Update existing transaction
    transactions[existingIndex] = {
      ...transactions[existingIndex],
      ...fullTransaction
    };
  } else {
    // Add new transaction
    transactions.push(fullTransaction);
  }
  
  // Save updated transactions
  saveTransactions(transactions);
}

/**
 * Check if a transaction has already been completed
 */
export function isTransactionCompleted(id: string): boolean {
  const transactions = getCachedTransactions();
  const transaction = transactions.find(t => t.id === id);
  return !!transaction && transaction.completed && transaction.status === 'success';
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