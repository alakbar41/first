import fs from 'fs';

// Read the contract file
const contractPath = 'blockchain/contracts/ImprovedStudentIdVoting.sol';
let contractContent;

try {
  contractContent = fs.readFileSync(contractPath, 'utf8');
  console.log("Contract file loaded successfully.");
  
  // Check for duplicate function declarations
  const functionDeclarations = [];
  const regex = /function\s+(\w+)\s*\(/g;
  let match;
  
  while ((match = regex.exec(contractContent)) !== null) {
    functionDeclarations.push(match[1]);
  }
  
  // Count occurrences of each function name
  const functionCounts = {};
  functionDeclarations.forEach(functionName => {
    functionCounts[functionName] = (functionCounts[functionName] || 0) + 1;
  });
  
  // Check for duplicates
  let hasDuplicates = false;
  Object.entries(functionCounts).forEach(([functionName, count]) => {
    if (count > 1 && functionName !== 'hasRole') {  // hasRole is intentionally overridden
      console.log(`Duplicate function declaration: ${functionName} (${count} occurrences)`);
      hasDuplicates = true;
    }
  });
  
  if (!hasDuplicates) {
    console.log("No duplicate function declarations found. Contract looks good!");
  }
  
} catch (error) {
  console.error(`Error reading contract file: ${error.message}`);
}