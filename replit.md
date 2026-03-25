# HealthGuardX

A decentralized health identity platform built for African healthcare realities. It provides patient-owned, tamper-proof health records with emergency access, blockchain-verified insurance claims, and role-based access for patients, doctors, hospitals, emergency responders, and insurance providers.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite, using TailwindCSS, Radix UI, shadcn/ui components, Wouter for routing
- **Backend**: Express.js + TypeScript (tsx for dev), served on port 5000
- **Database**: PostgreSQL via Drizzle ORM + drizzle-kit
- **Blockchain**: Multi-chain Web3 support via ethers.js + MetaMask SDK
- **Session**: express-session with connect-pg-simple
- **Auth**: Wallet-based authentication (MetaMask)

## Supported Blockchains

The application now supports multiple blockchain networks:

- **Ethereum Mainnet** (chainId: 1) - Production Ethereum network
- **Sepolia** (chainId: 11155111) - Ethereum testnet
- **Polygon Mainnet** (chainId: 137) - Polygon sidechain
- **Polygon Mumbai** (chainId: 80001) - Polygon testnet
- **BlockDAG Awakening** (chainId: 1043) - Default testnet

Users can switch between networks via MetaMask. The backend uses `BLOCKCHAIN_NETWORK` environment variable to set the default network (defaults to `blockdagAwakening`).

## Project Structure

```
client/        - React frontend (Vite root)
server/        - Express backend
shared/        - Shared TypeScript schema (Drizzle ORM models)
contracts/     - Solidity smart contracts
abis/          - Compiled ABI JSON files
migrations/    - Drizzle SQL migration files
scripts/       - Database utilities
```

## Development

The app runs as a single combined server (Express serves both the API and the Vite dev middleware):

```bash
npm run dev        # Start development server (port 5000)
npm run db:push    # Push schema to database
npm run build      # Build for production
npm run start      # Run production build
npm run check      # TypeScript type checking
```

## Environment Variables

Optional blockchain configuration:
```
BLOCKCHAIN_NETWORK=blockdagAwakening   # Default network
ETHEREUM_RPC_URL=...                    # Ethereum mainnet RPC
SEPOLIA_RPC_URL=...                     # Sepolia testnet RPC
POLYGON_RPC_URL=...                     # Polygon mainnet RPC
MUMBAI_RPC_URL=...                      # Mumbai testnet RPC
BLOCKDAG_RPC_URL=...                    # BlockDAG RPC
```

## Key Features

- Multi-chain wallet-based identity (MetaMask with network switching)
- KYC submission and role verification workflow
- Medical record management with IPFS (simulated CIDs)
- Emergency access with QR codes
- Insurance claims with blockchain verification
- Doctor consultations and chat
- Admin dashboard for approvals
- Automated monthly billing scheduler

## Fixes Applied

- Fixed TypeScript configuration for strict type checking
- Replaced BlockDAG-only configuration with multi-chain support
- Fixed schema field naming (affiliatedHospital instead of selectedHospital)
- Database schema fully migrated and operational
- All API endpoints working correctly

## Deployment

- Target: autoscale
- Build: `npm run build`
- Run: `node dist/index.js`
- Port: 5000
