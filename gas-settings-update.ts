// Template for updating gas settings
// File will be processed to update gas settings in the improved-web3-service.ts file

// Registration voter function (around line 478)
// Original:
// Use optimized gas settings with higher limits for Polygon Amoy
const options1 = {
  gasLimit: 500000,
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for Polygon Amoy
const options1_new = {
  gasLimit: 300000, // Sufficient gas limit for voter registration
  maxPriorityFeePerGas: ethers.parseUnits("2.0", "gwei"), // Lower priority fee
  maxFeePerGas: ethers.parseUnits("8.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Batch voter registration (around line 506)
// Original:
// Use optimized gas settings for batch operations
const options2 = {
  gasLimit: 1000000, // Higher gas limit for batch operations
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for batch operations
const options2_new = {
  gasLimit: 600000, // Moderate gas limit for batch operations
  maxPriorityFeePerGas: ethers.parseUnits("2.5", "gwei"), // Moderate priority fee
  maxFeePerGas: ethers.parseUnits("9.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Create candidate (around line 534)
// Original:
// Use optimized gas settings with higher limits for Polygon Amoy
const options3 = {
  gasLimit: 500000, // Higher gas limit for candidate creation
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for candidate creation
const options3_new = {
  gasLimit: 300000, // Sufficient gas limit for candidate creation
  maxPriorityFeePerGas: ethers.parseUnits("2.0", "gwei"), // Lower priority fee
  maxFeePerGas: ethers.parseUnits("8.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Register candidate for election (around line 570)
// Original:
// Use optimized gas settings with higher limits for Polygon Amoy
const options4 = {
  gasLimit: 500000,
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for candidate registration
const options4_new = {
  gasLimit: 300000, // Sufficient gas limit for registering candidates
  maxPriorityFeePerGas: ethers.parseUnits("2.0", "gwei"), // Lower priority fee
  maxFeePerGas: ethers.parseUnits("8.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Create ticket (around line 606)
// Original:
// Use optimized gas settings with higher limits for Polygon Amoy
const options5 = {
  gasLimit: 500000, // Higher gas limit for ticket creation
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for ticket creation
const options5_new = {
  gasLimit: 300000, // Sufficient gas limit for ticket creation
  maxPriorityFeePerGas: ethers.parseUnits("2.0", "gwei"), // Lower priority fee
  maxFeePerGas: ethers.parseUnits("8.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Register ticket (around line 646)
// Original:
// Use optimized gas settings with higher limits for Polygon Amoy
const options6 = {
  gasLimit: 500000,
  maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("35.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for ticket registration
const options6_new = {
  gasLimit: 300000, // Sufficient gas limit for registering tickets
  maxPriorityFeePerGas: ethers.parseUnits("2.0", "gwei"), // Lower priority fee
  maxFeePerGas: ethers.parseUnits("8.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Auto-update election status (around line 716)
// Original:
// Create optimized gas settings for Polygon Amoy
const options7 = {
  gasLimit: 1500000,
  maxPriorityFeePerGas: ethers.parseUnits("25.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("60.0", "gwei"),
  type: 2, // Use EIP-1559 transaction type
};

// Replacement:
// Use moderate gas settings for updating election status
const options7_new = {
  gasLimit: 750000, // Sufficient gas limit for auto-updating election status
  maxPriorityFeePerGas: ethers.parseUnits("3.0", "gwei"), // Moderate priority fee
  maxFeePerGas: ethers.parseUnits("12.0", "gwei"), // Reasonable max fee
  type: 2, // Use EIP-1559 transaction type
};

// Direct update (around line 749)
// Original:
const directOptions = {
  gasLimit: 2000000,
  maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"),
  maxFeePerGas: ethers.parseUnits("70.0", "gwei"),
  type: 2,
};

// Replacement:
const directOptions_new = {
  gasLimit: 1000000, // Sufficient gas limit for direct status updates
  maxPriorityFeePerGas: ethers.parseUnits("4.0", "gwei"), // Moderate priority fee for important operations
  maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for important operations
  type: 2, // Use EIP-1559 transaction type
};