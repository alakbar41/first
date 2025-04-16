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
 * Save transactions to localStorage with retry mechanism
 */
function saveTransactions(transactions: BlockchainTransaction[]): boolean {
  try {
    if (!Array.isArray(transactions)) {
      console.error('Invalid transactions data provided to saveTransactions - not an array:', transactions);
      return false;
    }

    // Make sure each transaction has the required fields
    const validTransactions = transactions.filter(t => {
      if (!t?.id || typeof t.id !== 'string') {
        console.warn('Filtering out invalid transaction missing ID:', t);
        return false;
      }
      if (typeof t.electionId !== 'number') {
        console.warn('Filtering out invalid transaction with invalid electionId:', t);
        return false;
      }
      return true;
    });

    console.log(`Saving ${validTransactions.length} transactions to cache:`, validTransactions);
    
    // Convert to JSON and save
    const dataToSave = JSON.stringify(validTransactions);
    console.log('Stringified data to save:', dataToSave);
    localStorage.setItem(STORAGE_KEY, dataToSave);
    
    // Verify data was saved correctly
    const savedData = localStorage.getItem(STORAGE_KEY);
    console.log('Verification - Data saved to localStorage:', savedData);
    
    if (savedData === dataToSave) {
      console.log('Transactions saved successfully');
      return true;
    } else {
      console.warn('Possible localStorage issue - saved data doesn\'t match original data');
      
      // Try one more time with a short delay
      setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, dataToSave);
          console.log('Retry saving transactions completed');
        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }
      }, 50);
      
      return false;
    }
  } catch (error) {
    console.error('Failed to save transactions to localStorage:', error);
    return false;
  }
}

/**
 * Record a completed transaction
 */
export function recordTransaction(transaction: Omit<BlockchainTransaction, 'timestamp' | 'status'> & { status?: 'pending' | 'success' | 'failed' }): void {
  try {
    if (!transaction || !transaction.id) {
      console.error('Invalid transaction data provided to recordTransaction:', transaction);
      return;
    }
    
    console.log(`Recording transaction to cache: ${transaction.id} (election: ${transaction.electionId}, type: ${transaction.type})`);
    
    let transactions: BlockchainTransaction[] = [];
    try {
      transactions = getCachedTransactions();
    } catch (error) {
      console.error('Failed to get existing transactions from cache:', error);
    }
    
    // Check if transaction already exists
    const existingIndex = transactions.findIndex(t => t.id === transaction.id);
    console.log(`Transaction ${transaction.id} exists in cache: ${existingIndex >= 0}`);
    
    const fullTransaction: BlockchainTransaction = {
      ...transaction,
      timestamp: Date.now(),
      status: transaction.status || 'success',
      completed: true
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
    const saved = saveTransactions(transactions);
    
    // Verify the transaction was saved correctly
    if (!saved) {
      console.warn('Transaction save failed on first attempt - retrying again immediately');
      saveTransactions(transactions);
    }
    
    // Secondary verification with delay
    setTimeout(() => {
      try {
        const saved = isTransactionCompleted(transaction.id);
        console.log(`Verification - Transaction ${transaction.id} saved correctly: ${saved}`);
        
        if (!saved) {
          console.warn('Transaction verification failed after delay - attempting to save one more time');
          saveTransactions(transactions);
        }
      } catch (verifyError) {
        console.error('Error during transaction verification:', verifyError);
      }
    }, 200);
  } catch (error) {
    console.error('Critical error in recordTransaction:', error);
  }
}

/**
 * Check if a transaction has already been completed
 */
export function isTransactionCompleted(id: string): boolean {
  try {
    if (!id) {
      console.error('Invalid transaction ID provided to isTransactionCompleted');
      return false;
    }
    
    let transactions: BlockchainTransaction[] = [];
    try {
      transactions = getCachedTransactions();
    } catch (error) {
      console.error('Failed to get cached transactions in isTransactionCompleted:', error);
      return false;
    }
    
    console.log(`Checking transaction completion for ID: ${id}`);
    console.log(`Found ${transactions.length} cached transactions in localStorage`);
    
    if (transactions.length > 0) {
      console.log('Transaction IDs in cache:', transactions.map(t => t.id).join(', '));
    }
    
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction) {
      console.log(`Found transaction ${id} in cache:`, transaction);
      const isCompleted = transaction.completed && transaction.status === 'success';
      console.log(`Transaction ${id} completed: ${isCompleted}, status: ${transaction.status}`);
      return isCompleted;
    } else {
      console.log(`Transaction ${id} not found in cache`);
      return false;
    }
  } catch (error) {
    console.error('Error in isTransactionCompleted:', error);
    return false;
  }
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
  try {
    const transactions: BlockchainTransaction[] = getCachedTransactions();
    const now = Date.now();
    const cutoff = now - (days * 24 * 60 * 60 * 1000);
    
    console.log(`Clearing transactions older than ${new Date(cutoff).toISOString()} (${days} days old)`);
    
    const filteredTransactions = transactions.filter(t => t.timestamp >= cutoff);
    
    if (filteredTransactions.length !== transactions.length) {
      console.log(`Removing ${transactions.length - filteredTransactions.length} old transactions`);
      saveTransactions(filteredTransactions);
    } else {
      console.log('No old transactions to remove');
    }
  } catch (error) {
    console.error('Error in clearOldTransactions:', error);
  }
}