#!/usr/bin/env tsx
/**
 * Final script to update remaining maxFeePerGas settings in improved-web3-service.ts
 */

import * as fs from 'fs';
import * as path from 'path';

async function updateMaxFees() {
  const filePath = path.join(process.cwd(), 'client/src/lib/improved-web3-service.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Array of replacements [searchText, replacementText]
  const replacements = [
    // Line 171 - Wallet connection
    [
      'maxFeePerGas: ethers.parseUnits("35.0", "gwei"), // Very high max fee to ensure acceptance',
      'maxFeePerGas: ethers.parseUnits("12.0", "gwei"), // Reasonable max fee'
    ],
    // Line 232 - Election creation
    [
      'maxFeePerGas: ethers.parseUnits("60.0", "gwei"), // Very high max fee to ensure acceptance',
      'maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for important operations'
    ],
    // Line 901 - Activation max fee
    [
      'maxFeePerGas: ethers.parseUnits("70.0", "gwei"), // Very high max fee to ensure acceptance',
      'maxFeePerGas: ethers.parseUnits("15.0", "gwei"), // Reasonable max fee for activation'
    ],
    // Ultra high gas limit operations 
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
  
  console.log('Max fee settings successfully updated!');
}

// Run the function
updateMaxFees().catch(console.error);