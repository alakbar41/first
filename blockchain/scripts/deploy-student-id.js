const { ethers } = require("hardhat");

async function main() {
  // Get the contract owner
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy the ImprovedStudentIdVoting contract
  const ImprovedStudentIdVoting = await ethers.getContractFactory("ImprovedStudentIdVoting");
  const studentIdVoting = await ImprovedStudentIdVoting.deploy();

  await studentIdVoting.waitForDeployment();

  const contractAddress = await studentIdVoting.getAddress();
  console.log("ImprovedStudentIdVoting contract deployed to:", contractAddress);

  // Save the contract address for later use
  console.log("\nContract Address for .env:");
  console.log(`VITE_NEW_CONTRACT_ADDRESS=${contractAddress}`);
  
  // All roles are assigned to the deployer in the constructor
  console.log("\nRole assignments (all roles assigned to deployer in constructor):");
  
  // Get role constants
  const roleConstants = await studentIdVoting.getRoleConstants();
  console.log(`- Admin Role: ${roleConstants[0]}`);
  console.log(`- Election Manager Role: ${roleConstants[1]}`);
  console.log(`- Voter Manager Role: ${roleConstants[2]}`);
  
  // Check if the deployer has all roles
  const roles = await studentIdVoting.checkRoles(deployer.address);
  console.log(`\nDeployer has Admin role: ${roles[0]}`);
  console.log(`Deployer has Election Manager role: ${roles[1]}`);
  console.log(`Deployer has Voter Manager role: ${roles[2]}`);
  
  // Register deployer as the first voter automatically 
  // This is done in the constructor already, just a confirmation
  console.log("\nDeployer address registered as a voter automatically in the constructor");
  
  // Return the contract instance for testing
  return studentIdVoting;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });