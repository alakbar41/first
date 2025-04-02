// Deployment script for ImprovedOptimizedVoting.sol
const hre = require("hardhat");

async function main() {
  console.log("Deploying ImprovedOptimizedVoting contract...");
  
  // Get the contract factory
  const ImprovedOptimizedVoting = await hre.ethers.getContractFactory("ImprovedOptimizedVoting");
  
  // Deploy the contract
  const contract = await ImprovedOptimizedVoting.deploy();
  
  // Wait for deployment to finish
  await contract.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await contract.getAddress();
  
  console.log(`✓ ImprovedOptimizedVoting deployed to: ${contractAddress}`);
  console.log(`✓ Owner: ${await contract.owner()}`);
  
  console.log("\nVerification command:");
  console.log(`npx hardhat verify --network amoy ${contractAddress}`);
  
  return { contract, contractAddress };
}

// Execute the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };