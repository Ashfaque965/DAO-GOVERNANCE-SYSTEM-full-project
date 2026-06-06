const { expect } = require("chai");
const { ethers } = require("hardhat");

async function moveBlocks(count) {
  for (let i = 0; i < count; i += 1) {
    await ethers.provider.send("evm_mine", []);
  }
}

async function moveTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("DAO governance", function () {
  it("executes a proposal through the timelock", async function () {
    const [deployer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(deployer.address);
    await token.waitForDeployment();

    const Timelock = await ethers.getContractFactory("TimelockController");
    const minDelay = 2;
    const timelock = await Timelock.deploy(minDelay, [], [], deployer.address);
    await timelock.waitForDeployment();

    const Governor = await ethers.getContractFactory("DaoGovernor");
    const governor = await Governor.deploy(token.target, timelock.target);
    await governor.waitForDeployment();

    const Box = await ethers.getContractFactory("Box");
    const box = await Box.deploy(deployer.address);
    await box.waitForDeployment();

    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    const adminRole = await timelock.DEFAULT_ADMIN_ROLE();

    await (await timelock.grantRole(proposerRole, governor.target)).wait();
    await (await timelock.grantRole(executorRole, ethers.ZeroAddress)).wait();
    await (await timelock.revokeRole(adminRole, deployer.address)).wait();

    await (await box.transferOwnership(timelock.target)).wait();

    await (await token.delegate(deployer.address)).wait();

    const newValue = 42;
    const encodedCall = box.interface.encodeFunctionData("store", [newValue]);
    const description = "Store 42 in the box";
    const descriptionHash = ethers.id(description);

    await (await governor.propose([box.target], [0], [encodedCall], description)).wait();

    const proposalId = await governor.hashProposal(
      [box.target],
      [0],
      [encodedCall],
      descriptionHash
    );

    const votingDelay = await governor.votingDelay();
    await moveBlocks(Number(votingDelay));

    await (await governor.castVote(proposalId, 1)).wait();

    const votingPeriod = await governor.votingPeriod();
    await moveBlocks(Number(votingPeriod));

    await (await governor.queue([box.target], [0], [encodedCall], descriptionHash)).wait();
    await moveTime(minDelay + 1);

    await (await governor.execute([box.target], [0], [encodedCall], descriptionHash)).wait();

    expect(await box.retrieve()).to.equal(newValue);
  });
});
