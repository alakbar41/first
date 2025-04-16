/**
 * Script to update gas settings in improved-web3-service.ts
 * 
 * This script targets the specific gas settings that weren't updated by the previous bash script.
 * It exports a simple function that can be called to update the settings.
 */

import * as fs from 'fs';
import * as path from 'path';

// Function to update gas settings in the file
export function updateGasSettings() {
  const filePath = path.join(process.cwd(), 'client/src/lib/improved-web3-service.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Array of replacements [searchText, replacementText]
  const replacements = [
    // Line 169 - Wallet connection
    [
      'gasLimit: 1000000, // Extremely high gas limit to ensure transaction success',
      'gasLimit: 400000, // Moderate gas limit for wallet operations'
    ],
    // Line 230 - Election creation
    [
      'gasLimit: 2000000, // Ultra high gas limit to ensure election creation success',
      'gasLimit: 800000, // Moderate gas limit for election creation while ensuring success'
    ],
    // Lines 345, 407 - Create election with candidates
    [
      'gasLimit: 1500000, // Reasonable gas limit for creating election with candidates',
      'gasLimit: 800000, // Optimized gas limit for creating election with candidates'
    ],
    // Line 899 - Election activation
    [
      'gasLimit: 2000000, // Ultra high gas limit for activation',
      'gasLimit: 600000, // Moderate gas limit for election activation' 
    ],
    // Lines 1119, 1258, 1372 - Various operations with ultra high limits
    [
      'gasLimit: 2000000, // Ultra high gas limit for better success chance',
      'gasLimit: 600000, // Moderate gas limit optimized for operations'
    ],
    // Low gas operations remain unchanged as they're already optimized
  ];

  // Apply all replacements
  for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
  }

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content);
  
  console.log('Additional gas settings successfully updated!');
}

// Run the function if this script is executed directly
if (require.main === module) {
  updateGasSettings();
}