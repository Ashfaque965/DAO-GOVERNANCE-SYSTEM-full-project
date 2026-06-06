# DAO Governance System

Minimal on-chain governance example using token-based voting and timelock execution.

## Features

- ERC20 voting token with delegation
- Governor with configurable delay/period/quorum
- Timelock-controlled execution
- End-to-end test for proposing, voting, queuing, and executing

## Quick Start

```bash
npm install
npm run compile
npm test
```

## Deploy

```bash
npm run deploy -- --network hardhat
```

## Notes

- Voting power requires delegation. The deploy script delegates to the deployer.
- The governor settings are intentionally short for local testing.
