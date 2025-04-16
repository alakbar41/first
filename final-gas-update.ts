#!/usr/bin/env tsx
/**
 * Script to update final gas priority fee settings in improved-web3-service.ts
 */

import * as fs from 'fs';
import * as path from 'path';

async function updateGasPriorityFees() {
  const filePath = path.join(process.cwd(), 'client/src/lib/improved-web3-service.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Array of replacements [searchText, replacementText]
  const replacements = [
    // Line 170 - Wallet connection
    [
      'maxPriorityFeePerGas: ethers.parseUnits("15.0", "gwei"), // Very high priority fee to prioritize transaction',
      'maxPriorityFeePerGas: ethers.parseUnits("3.0", "gwei"), // Moderate priority fee'
    ],
    // Line 171 - Wallet connection max fee
    [
      'maxFeePerGas: ethers.parseUnits("35.0", "gwei"), // Higher max fee to ensure transaction goes through',
      'maxFeePerGas: ethers.parseUnits("12.0", "gwei"), // Reasonable max fee'
    ],
    // Line 231 - Election creation
    [
      'maxPriorityFeePerGas: ethers.parseUnits("25.0", "gwei"), // Very high priority fee to prioritize transaction',
      'maxPriorityFeePerGas: ethers.parseUnits("4.0", "gwei"), // Moderate priority fee for important operations'
    ],
    // Line 232 - Election creation max fee
    [
      'maxFeePerGas: ethers.parseUnits("50.0", "gwei"), // Higher max fee to ensure transaction goes through',
      'maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for important operations'
    ],
    // Line 899 - Election activation
    [
      'gasLimit: 600000, // Moderate gas limit for election activation',
      'gasLimit: 600000, // Moderate gas limit for election activation'
    ],
    // Line 900 - Activation priority fee
    [
      'maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Very high priority fee for activation',
      'maxPriorityFeePerGas: ethers.parseUnits("4.0", "gwei"), // Moderate priority fee for activation'
    ],
    // Line 901 - Activation max fee
    [
      'maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Higher max fee to ensure activation goes through',
      'maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for activation'
    ],
    // Ultra high gas limit operations at lines 1119, 1258, 1372
    [
      'maxPriorityFeePerGas: ethers.parseUnits("30.0", "gwei"), // Ultra high priority fee',
      'maxPriorityFeePerGas: ethers.parseUnits("4.0", "gwei"), // Moderate priority fee for important operations'
    ],
    // Ultra high max fee for better success
    [
      'maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Ultra high max fee',
      'maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for important operations'
    ]
  ];

  // Apply all replacements
  for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
  }

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  
  console.log('Final gas priority fee settings successfully updated!');
}

// Run the function
updateGasPriorityFees().catch(console.error);