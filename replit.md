# HealthGuardX - Decentralized Health Identity System on Solana

## Project Overview

HealthGuardX is a full-stack decentralized healthcare identity platform built on the **Solana ecosystem** using **Phantom Wallet**. It provides secure, patient-owned medical records, emergency QR access, and blockchain-verified insurance claims.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite, served via Express middleware on port 5000
- **Backend**: Express.js + TypeScript + Drizzle ORM + PostgreSQL (Neon serverless)
- **Blockchain**: Solana via `@solana/web3.js`, Phantom wallet for authentication & signing
- **Storage**: Pinata IPFS for medical records and KYC documents

## Key Files

| File | Purpose |
|---|---|
| `client/src/contexts/WalletContext.tsx` | Phantom wallet integration & auth state |
| `client/src/lib/blockchain.ts` | Solana client (`SolanaBlockchainClient`) |
| `server/blockchain.ts` | Server-side Solana RPC service |
| `server/blockchain-config.ts` | Solana network & program config |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database abstraction layer |
| `server/ipfs.ts` | Pinata IPFS integration |
| `shared/schema.ts` | Drizzle ORM database schema |

## Wallet Integration

- **Wallet**: Phantom (replaces MetaMask)
- **Chain**: Solana (replaces BlockDAG/EVM)
- **Detection**: `window.phantom?.solana` or `window.solana` with `isPhantom` check
- **Connect**: `provider.connect()` → returns `{ publicKey }`
- **Sign**: `provider.signMessage(encodedMsg, 'utf8')` → returns `{ signature, publicKey }`
- **Address format**: Solana base58 public keys (44 chars), not hex

## Solana Networks

- **Devnet** (default): `https://api.devnet.solana.com`
- **Mainnet**: `https://api.mainnet-beta.solana.com`
- **Testnet**: `https://api.testnet.solana.com`
- Configured via `SOLANA_NETWORK` env var

## Running the App

```bash
npm install
npm run dev        # Development (port 5000)
npm run build      # Production build
npm run start      # Production server
npm run db:push    # Push schema to database
```

## Environment Variables

```env
DATABASE_URL=postgresql://...  # Required: Neon PostgreSQL
PINATA_API_KEY=...             # Optional: IPFS storage
PINATA_SECRET_KEY=...          # Optional: IPFS storage
SOLANA_NETWORK=devnet          # mainnet | devnet | testnet
SOLANA_RPC_URL=...             # Optional: custom Solana RPC
```

## User Roles

- **patient** → `/patient` - Default role after wallet connect
- **doctor** → `/doctor`
- **hospital** → `/hospital`
- **emergency_responder** → `/emergency`
- **insurance_provider** → `/insurance`
- **admin** → `/admin`

## Adding Admin Wallet

Navigate to `server/routes.ts` and add your Solana wallet address to the admin check:
```typescript
|| walletAddress === "YOUR_SOLANA_WALLET_ADDRESS"
```

## Dependencies

Key packages:
- `@solana/web3.js` - Solana blockchain interaction
- `ethers` - Still present but no longer used for core features
- `drizzle-orm` + `@neondatabase/serverless` - Database
- `express` + `tsx` - Server

## Notes

- The server and frontend run together on port 5000 (Express serves Vite in dev, static files in prod)
- Wallet addresses are Solana public keys (base58) stored in `users.walletAddress`
- Payment flow uses Phantom's `signMessage` for authorization proof (signature-based)
- Admin approval is required for KYC and role applications
