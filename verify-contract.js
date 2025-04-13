const fs = require('fs');
const solc = require('solc');
const path = require('path');

// Find the OpenZeppelin contracts directory
const openZeppelinPath = path.resolve(__dirname, 'node_modules/@openzeppelin');

// Read the contract file
const contractPath = 'blockchain/contracts/ImprovedStudentIdVoting.sol';
const contractSource = fs.readFileSync(contractPath, 'utf8');

// Configure solc compiler input
const input = {
  language: 'Solidity',
  sources: {
    'ImprovedStudentIdVoting.sol': {
      content: contractSource,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

// Compile the contract
try {
  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors
  if (output.errors) {
    output.errors.forEach((error) => {
      console.error(`Error: ${error.message}`);
    });
    if (output.errors.some(e => e.type === 'Error')) {
      console.error('Compilation failed due to errors.');
      process.exit(1);
    } else {
      console.warn('Compilation succeeded with warnings.');
    }
  } else {
    console.log('Contract compiled successfully with no errors or warnings.');
  }
} catch (error) {
  console.error('Compilation error:', error);
  process.exit(1);
}