# Midnight Crowdfunding DApp

A privacy-preserving crowdfunding decentralized application built on Midnight testnet using Compact smart contracts, React frontend, and Node.js API integration.

## Contract Address

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

> [!IMPORTANT]
> The smart contract has not been deployed yet. Replace `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` with your deployed contract address after manual deployment.

## Features

- **Privacy-Preserving Pledges**: Backers submit pledges through private zero-knowledge witnesses without exposing their private key or individual transaction history.
- **Selective State Disclosure**: Campaign metadata (title, description, goal, total raised, backer count, creator address) is updated on-chain via `disclose()`.
- **Campaign Life-cycle Management**:
  - **Launch**: Creators define campaign goal, description, and deadline.
  - **Contribute**: Backers contribute funds; total raised updates automatically and campaign status transitions to `FUNDED` once the goal is reached.
  - **Withdraw**: Campaign creators withdraw funds upon reaching the target goal.
  - **Close**: Creators can close active campaigns when needed.
- **Dual Interface**: Full interactive Web UI (`bboard-ui`) and CLI tool (`bboard-cli`).

## What This Project Does

This application enables campaign creators to raise funds securely while giving backers complete privacy guarantees powered by Midnight's zero-knowledge technology. Unlike traditional blockchains where every pledge ties a backer's wallet address directly to their pledge amount and campaign preference, Midnight Crowdfunding uses private witnesses to keep individual backer identity and pledge details hidden off-ledger while disclosing only the updated total campaign funds raised to the public ledger.

## Privacy Model

### Public Data (On-Ledger)
- `status`: Campaign status (`DRAFT`, `ACTIVE`, `FUNDED`, `CLOSED`)
- `title`: Campaign title string
- `description`: Detailed campaign description
- `fundingGoal`: Target amount to raise (64-bit unsigned int)
- `totalRaised`: Disclosed aggregate pledged amount
- `deadline`: Unix timestamp target for completion
- `backerCount`: On-chain counter of total backers
- `creator`: Derived public key of campaign creator (`Bytes<32>`)

### Private Data (Off-Ledger Witness)
- `localSecretKey`: Secret key used for zero-knowledge identity generation
- `pledgeAmount`: Individual pledge size provided by backer witness before selective disclosure

### Privacy Guarantees
1. **Identity Protection**: Backers prove authorization and identity via zero-knowledge proofs without exposing raw secret keys on-chain.
2. **Selective Disclosure**: Individual contribution sizes originate from private witnesses; only aggregated ledger totals are disclosed.
3. **Creator Ownership Proof**: Creators prove ownership to withdraw or close campaigns without revealing raw private keys.

## Tech Stack

- **Smart Contract**: Compact (v0.5.1)
- **Frontend**: React, TypeScript, Vite, Material UI (MUI), RxJS
- **API & Client**: Midnight JS Protocols & SDKs (`@midnight-ntwrk/midnight-js-*`)
- **CLI**: Node.js CLI with Pino logging & testkit integration
- **Runtime**: Node.js (>= v22.0.0), Docker, Docker Desktop

## Folder Structure

```
├── api/               # API layer interfacing with Midnight contracts & RxJS streams
├── bboard-cli/        # Interactive Command Line Interface for terminal deployment/joining
├── bboard-ui/         # React web interface with Lace wallet integration
├── contract/          # Compact contract source (`crowdfunding.compact`) and compiled bindings
├── README.md          # Project documentation and deployment guide
└── package.json       # Workspace root package configuration
```

## Prerequisites

Before running locally, ensure you have installed:

- **Node.js**: v22.0.0 or higher (`node --version`)
- **Docker**: Installed and running (`docker --version`)
- **Compact Compiler**: Installed globally or executable via Docker script (`compact --version`)
- **Proof Server**: Pulled and running (`docker run -p 6300:6300 midnightnetwork/proof-server`)
- **Midnight Lace Wallet**: Web extension installed in your browser for UI interaction.

## Installation

Clone the repository and install dependencies across all workspace packages:

```bash
npm install
cd api && npm install && cd ..
cd contract && npm install && cd ..
cd bboard-cli && npm install && cd ..
```

## Compile Compact Contract

Compile the `crowdfunding.compact` smart contract:

```bash
npm run compact
```

This compiles `contract/src/crowdfunding.compact` into TypeScript bindings and zero-knowledge circuit assets located in `contract/src/managed/crowdfunding`.

## Build

Build all packages across the workspace:

```bash
npm run build
```

Or build the CLI specifically:

```bash
cd bboard-cli
npm run build
cd ..
```

## Manual Deployment

Smart contract deployment is intentionally skipped in this pre-deployment build stage.

To manually deploy the contract to the Midnight Preprod network, execute:

```bash
NODE_OPTIONS="--max-old-space-size=12288" npm run deploy -- --network preprod
```

Alternatively, use the interactive CLI:

```bash
npm run cli
```

Select **Option 1 (Deploy a new crowdfunding contract)** to execute deployment.

## After Deployment

After completing the manual contract deployment:

1. Copy the resulting deployed contract address from your terminal output (e.g., `0x...` or hex string).
2. Replace all occurrences of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` in the following files:
   - `README.md`
   - `api/src/common-types.ts`
   - `bboard-ui/.env.preprod`
   - `bboard-ui/.env.preview`

No additional code modifications or rebuilds are required.

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `CONTRACT_ADDRESS` | `api/src/common-types.ts` | Deployed contract address placeholder |
| `VITE_CONTRACT_ADDRESS` | `bboard-ui/.env.preprod` | Frontend contract address configuration |
| `VITE_NETWORK_ID` | `bboard-ui/.env.preprod` | Target network (`preprod` or `preview`) |

## Screenshots

<!-- Add UI screenshots here after deployment -->
![Dashboard Placeholder](https://via.placeholder.com/800x450?text=Midnight+Crowdfunding+Dashboard)

## Initial Idea

The goal of this project is to provide a fully decentralized, privacy-first crowdfunding platform where backers can support creative projects and public goods without broadcasting their individual pledge details to the world. Powered by Midnight's zero-knowledge technology, public funding metrics remain accurate and verifiable while user privacy is completely preserved.

## Troubleshooting

### Node version incompatibility
Ensure Node v22+ is active: `node --version`.

### Compact compiler not found on Windows
If Windows `compact.exe` conflicts with the compact compiler, use `npm run compact` which invokes the containerized compiler.

### Proof server connection error
Make sure Docker proof-server is running on port 6300:
```bash
docker run -p 6300:6300 midnightnetwork/proof-server
```
