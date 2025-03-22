// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  console.log("Deploying AdaUniversityVoting contract to", hre.network.name);

  // Get the ContractFactory for our voting contract
  const AdaUniversityVoting = await hre.ethers.getContractFactory("AdaUniversityVoting");
  
  // Deploy the contract
  console.log("Deploying contract...");
  const voting = await AdaUniversityVoting.deploy();

  // Wait for deployment to finish
  console.log("Waiting for deployment transaction to be mined...");
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log(`AdaUniversityVoting deployed to: ${contractAddress}`);
  
  console.log("Deployment completed successfully!");
  
  // Display verification command for Polygon Amoy explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nVerify contract on Polygon Amoy Explorer with:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });