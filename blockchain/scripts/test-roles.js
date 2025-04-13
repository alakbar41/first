const { ethers } = require("hardhat");

async function testRoles() {
  console.log("Testing role-based access control in ImprovedStudentIdVoting contract...");
  
  // Get signers for different roles
  const [admin, electionManager, voterManager, regularUser] = await ethers.getSigners();
  
  console.log("Account addresses:");
  console.log(`Admin: ${admin.address}`);
  console.log(`Election Manager: ${electionManager.address}`);
  console.log(`Voter Manager: ${voterManager.address}`);
  console.log(`Regular User: ${regularUser.address}`);
  
  // Deploy the contract (admin is the deployer)
  const ImprovedStudentIdVoting = await ethers.getContractFactory("ImprovedStudentIdVoting");
  const contract = await ImprovedStudentIdVoting.deploy();
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`\nContract deployed to: ${contractAddress}`);
  
  // Get role constants
  const roles = await contract.getRoleConstants();
  const ADMIN_ROLE = roles[0];
  const ELECTION_MANAGER_ROLE = roles[1];
  const VOTER_MANAGER_ROLE = roles[2];
  
  console.log("\nRole Constants:");
  console.log(`ADMIN_ROLE: ${ADMIN_ROLE}`);
  console.log(`ELECTION_MANAGER_ROLE: ${ELECTION_MANAGER_ROLE}`);
  console.log(`VOTER_MANAGER_ROLE: ${VOTER_MANAGER_ROLE}`);
  
  // Verify admin has all roles (from constructor)
  const adminRoles = await contract.checkRoles(admin.address);
  console.log("\nAdmin roles after deployment:");
  console.log(`- Admin role: ${adminRoles[0]}`);
  console.log(`- Election Manager role: ${adminRoles[1]}`);
  console.log(`- Voter Manager role: ${adminRoles[2]}`);
  
  // Assign roles using the manageRoles function
  console.log("\nAssigning roles to test accounts...");
  await contract.manageRoles(
    electionManager.address,
    false,  // Not admin
    true,   // Is election manager
    false   // Not voter manager
  );
  
  await contract.manageRoles(
    voterManager.address,
    false,  // Not admin
    false,  // Not election manager
    true    // Is voter manager
  );
  
  // Verify role assignments
  const electionManagerRoles = await contract.checkRoles(electionManager.address);
  console.log("\nElection Manager roles after assignment:");
  console.log(`- Admin role: ${electionManagerRoles[0]}`);
  console.log(`- Election Manager role: ${electionManagerRoles[1]}`);
  console.log(`- Voter Manager role: ${electionManagerRoles[2]}`);
  
  const voterManagerRoles = await contract.checkRoles(voterManager.address);
  console.log("\nVoter Manager roles after assignment:");
  console.log(`- Admin role: ${voterManagerRoles[0]}`);
  console.log(`- Election Manager role: ${voterManagerRoles[1]}`);
  console.log(`- Voter Manager role: ${voterManagerRoles[2]}`);
  
  // Test operation with different role permissions
  console.log("\nTesting operations with different roles...");
  
  // 1. Admin creates an election (future timestmap)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const startTime = currentTimestamp + 3600; // 1 hour from now
  const endTime = currentTimestamp + 7200;   // 2 hours from now
  
  try {
    const tx = await contract.createElection(
      0, // Senator election type
      startTime,
      endTime
    );
    await tx.wait();
    console.log("✓ Admin successfully created an election");
  } catch (error) {
    console.log("✗ Admin failed to create an election");
    console.error(error.message);
  }
  
  // 2. Election Manager creates an election
  try {
    const tx = await contract.connect(electionManager).createElection(
      0, // Senator election type
      startTime + 100,
      endTime + 100
    );
    await tx.wait();
    console.log("✓ Election Manager successfully created an election");
  } catch (error) {
    console.log("✗ Election Manager failed to create an election");
    console.error(error.message);
  }
  
  // 3. Voter Manager tries to create an election (should fail)
  try {
    const tx = await contract.connect(voterManager).createElection(
      0, // Senator election type
      startTime + 200,
      endTime + 200
    );
    await tx.wait();
    console.log("! Voter Manager unexpectedly created an election");
  } catch (error) {
    console.log("✓ Voter Manager correctly failed to create an election (expected)");
  }
  
  // 4. Voter Manager registers a voter
  try {
    const tx = await contract.connect(voterManager).registerVoter(regularUser.address);
    await tx.wait();
    console.log("✓ Voter Manager successfully registered a voter");
  } catch (error) {
    console.log("✗ Voter Manager failed to register a voter");
    console.error(error.message);
  }
  
  // 5. Election Manager tries to register a voter (should fail)
  try {
    const tx = await contract.connect(electionManager).registerVoter(admin.address);
    await tx.wait();
    console.log("! Election Manager unexpectedly registered a voter");
  } catch (error) {
    console.log("✓ Election Manager correctly failed to register a voter (expected)");
  }
  
  // Check if regular user was registered as a voter
  const isRegistered = await contract.isRegisteredVoter(regularUser.address);
  console.log(`\nRegular user registered status: ${isRegistered}`);
  
  console.log("\nAll role-based access control tests completed!");
}

// Execute the testing function
if (require.main === module) {
  testRoles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}