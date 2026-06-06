const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const Timelock = await ethers.getContractFactory("TimelockController");
  const minDelay = 3600;
  const timelock = await Timelock.deploy(minDelay, [], [], deployer.address);
  await timelock.waitForDeployment();

  const Governor = await ethers.getContractFactory("DaoGovernor");
  const governor = await Governor.deploy(token.target, timelock.target);
  await governor.waitForDeployment();

  console.log(`Token: ${token.target}`);
  console.log(`Timelock: ${timelock.target}`);
  console.log(`Governor: ${governor.target}`);

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const adminRole = await timelock.DEFAULT_ADMIN_ROLE();

  await (await timelock.grantRole(proposerRole, governor.target)).wait();
  await (await timelock.grantRole(executorRole, ethers.ZeroAddress)).wait();
  await (await timelock.revokeRole(adminRole, deployer.address)).wait();

  await (await token.delegate(deployer.address)).wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
