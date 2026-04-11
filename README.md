# HealthGuardX - Decentralized Health Identity System on Solana

## Important note to reviewers, judges
This app requires an admin to approve KYC verifications and role application approvals. When testing, you can contact abdurrazaqiliyaa@gmail.com or call 09123302285 / 08142241819. Alternatively, navigate to `server/routes.ts` and add your Phantom wallet address as an admin (`|| "YOUR_SOLANA_ADDRESS"`) so you can act as admin immediately upon connecting.

## Overview

HealthGuardX is a blockchain-integrated system built on the **Solana ecosystem** designed to provide secure, patient-owned medical records and streamline insurance claim management. It features emergency QR access, role-based dashboards for various healthcare stakeholders (patients, doctors, hospitals, emergency responders, insurance providers, administrators), and blockchain-verified insurance claims. The project uses **Phantom Wallet** for Web3 authentication and **SOL** as the native currency for transactions. The platform enhances data security, improves accessibility for authorized personnel, and provides a robust platform for managing health identities and claims.

# HealthGuardX - Comprehensive System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [User Roles and Features](#user-roles-and-features)
4. [Workflows and User Journeys](#workflows-and-user-journeys)
5. [Security and Data Protection](#security-and-data-protection)
6. [Problems Solved](#problems-solved)
7. [Technical Implementation](#technical-implementation)
8. [Getting Started Guide](#getting-started-guide)

---

## System Overview

### What is HealthGuardX?

HealthGuardX is a blockchain-integrated decentralized health identity system that puts patients in control of their medical records. Built on **Solana**, it is a secure digital vault for your health information, where you decide who can access your data and when.

### Key Value Propositions

- **Patient-Owned Data**: You own your medical records, not the hospital or doctor
- **Emergency Access**: First responders can instantly access critical health information via QR codes
- **Solana Verified**: All transactions and claims are verified and tamper-proof on the Solana blockchain
- **Universal Accessibility**: Access your health records from anywhere, anytime
- **Streamlined Insurance**: Automated claim processing reduces paperwork and delays

### Built for African Healthcare Realities

The system is specifically designed to address challenges in African healthcare systems:
- Works with limited internet connectivity (QR codes work offline)
- Affordable subscription model (20 USD for annual access)
- Multi-stakeholder support (hospitals, clinics, insurance providers)
- Emergency response capabilities for areas with limited infrastructure

---

## System Architecture

### Technology Stack Overview

HealthGuardX uses modern web technologies combined with Solana blockchain principles to create a secure, scalable healthcare platform.

#### Frontend Layer
- **Framework**: React 18 with TypeScript for type safety
- **UI Components**: Shadcn/ui (built on Radix UI) for accessible, beautiful interfaces
- **Styling**: Tailwind CSS for responsive design that works on all devices
- **State Management**: TanStack Query (React Query) for efficient data fetching and caching
- **Routing**: Wouter for fast, lightweight navigation
- **Blockchain Client**: `@solana/web3.js` for Solana network interaction

#### Backend Layer
- **Server**: Express.js with TypeScript for robust API development
- **Database**: PostgreSQL (Neon serverless) for reliable, scalable data storage
- **ORM**: Drizzle ORM for type-safe database queries
- **Authentication**: Web3 wallet-based (Phantom) — no passwords to remember or lose
- **Blockchain Library**: `@solana/web3.js` for server-side Solana RPC calls

### Wallet Integration

HealthGuardX uses **Phantom Wallet** exclusively for all Web3 authentication and signing:

- **Browser Extension**: Install from [phantom.app](https://phantom.app/download)
- **Mobile App**: Available on iOS and Android — use the built-in browser to access the dApp
- **Connection Flow**: Click "Connect Wallet" → Phantom prompts for approval → wallet address becomes your health identity
- **Message Signing**: Used for payment authorization and cryptographic proof of identity
- **No Private Keys**: The server never stores or handles private keys; all signing happens in the user's Phantom wallet

### Blockchain & IPFS Integration

- **Solana Network Support**:
  - **Mainnet**: `https://api.mainnet-beta.solana.com`
  - **Devnet** (default for development): `https://api.devnet.solana.com`
  - **Testnet**: `https://api.testnet.solana.com`

- **Pinata IPFS Storage**: All medical records uploaded to IPFS with real CIDs
  - KYC documents stored on IPFS for immutable verification
  - Treatment logs and patient data permanently stored on decentralized storage
  - File integrity verified with SHA-256 hashes
  - Automatic fallback to simulated storage if IPFS is unavailable

- **Blockchain Service Layer**:
  - `server/blockchain.ts`: Solana RPC read-only service for querying on-chain state
  - `server/blockchain-config.ts`: Solana network and program configuration
  - `client/src/lib/blockchain.ts`: Frontend Solana client for user transactions
  - Users sign transactions with their Phantom wallets on the frontend
  - Server only reads blockchain state — never stores private keys
  - Supports user registration, KYC, medical records, treatments, insurance, and payments via frontend wallet signing

- **IPFS Service Module**: Built complete Pinata integration:
  - `server/ipfs.ts`: Handles file and JSON uploads to Pinata
  - Supports both file upload (with base64 encoding) and JSON data upload
  - Returns CID, hash, and gateway URL for each upload

### Data Flow Architecture

```
Patient Browser
     ↓ (HTTPS)
Express.js API (Port 5000)
     ↓
PostgreSQL (Neon Serverless) ← Primary data store
     ↓
Solana RPC ← Blockchain verification & audit trail
     ↓
IPFS/Pinata ← Decentralized file storage
```

---

## User Roles and Features

### 1. Patient
- Connect Phantom wallet to create a unique health identity
- Upload and manage medical records (encrypted, stored on IPFS)
- Generate QR codes for emergency access
- Apply for professional roles (doctor, hospital, etc.)
- Manage insurance policies and view claims
- Control who has access to their medical data

### 2. Doctor
- View and manage assigned patients
- Create treatment logs and prescriptions
- Request access to patient medical records
- Participate in consultations
- View audit trails of record access

### 3. Hospital
- Manage institutional accounts and staff
- Submit insurance claims on behalf of patients
- View and manage patient admissions
- Process invoices and payments

### 4. Emergency Responder
- Scan patient QR codes for instant access to critical info
- View emergency medical data without requiring patient login
- Access allergy info, blood type, emergency contacts

### 5. Insurance Provider
- Review and approve/reject insurance claims
- Manage insurance policies and premium payments
- View analytics on claims processing

### 6. Admin
- Approve/reject KYC verifications
- Manage user roles and permissions
- View system-wide audit logs
- Monitor platform activity

---

## Workflows and User Journeys

### New Patient Onboarding
1. Install **Phantom Wallet** browser extension or mobile app
2. Visit HealthGuardX and click "Connect Wallet"
3. Approve connection in Phantom — your Solana address becomes your health ID
4. Complete KYC (upload ID document, stored on IPFS)
5. Wait for admin approval
6. Start uploading medical records and generating your QR code

### Doctor Role Application
1. Connect Phantom wallet as a patient
2. Navigate to "Apply for Role" → select Doctor
3. Fill in professional license details
4. Submit application for admin review
5. Upon approval, doctor dashboard is unlocked

### Hospital / Insurance Provider Role Application
1. Connect Phantom wallet
2. Navigate to "Apply for Role" → select Hospital or Insurance Provider
3. Authorize the **20 USD annual subscription fee** via Phantom (message signing)
4. Complete the KYC application form
5. Admin reviews and approves or rejects

### Emergency Access Flow
1. Patient generates a QR code from their dashboard
2. Emergency responder scans QR with their device
3. Critical info (blood type, allergies, medications, emergency contacts) is displayed immediately
4. No login required for the responder — read-only emergency access

---

## Security and Data Protection

### Wallet-Based Authentication
- No usernames or passwords — your Phantom wallet IS your identity
- Cryptographic message signing proves ownership without exposing private keys
- Session data stored in browser localStorage; server validates wallet address on each request

### Encrypted Medical Records
- Medical documents encrypted client-side before upload
- AES-256 encryption ensures records are unreadable without the patient's key
- Stored on IPFS for decentralization; CID stored in PostgreSQL

### Blockchain Audit Trail
- All significant actions (record access, claim submission, role changes) logged on Solana
- Immutable audit history cannot be altered or deleted
- Patients can view exactly who accessed their records and when

### Role-Based Access Control
- Strict server-side enforcement of role permissions
- Patients must explicitly grant access to doctors/hospitals
- Access grants are time-limited and revocable
- Emergency access is read-only and logged

---

## Problems Solved

| Problem | Solution |
|---|---|
| Lost medical records | Permanent IPFS storage with Solana audit trail |
| Slow insurance claims | Smart contract-based automated verification |
| Emergency access | QR codes with critical info always accessible |
| Data ownership | Patient controls all access grants |
| Healthcare fraud | Blockchain verification of all claims |
| Password security | Phantom wallet — no passwords |

---

## Technical Implementation

### Environment Variables

```env
DATABASE_URL=postgresql://...  # Neon PostgreSQL connection string
PINATA_API_KEY=...             # IPFS storage (optional)
PINATA_SECRET_KEY=...          # IPFS storage (optional)
SOLANA_NETWORK=devnet          # mainnet | devnet | testnet
SOLANA_RPC_URL=...             # Optional custom RPC endpoint
```

### Key Files

| File | Purpose |
|---|---|
| `client/src/contexts/WalletContext.tsx` | Phantom wallet integration & auth state |
| `client/src/lib/blockchain.ts` | Solana client for frontend transactions |
| `server/blockchain.ts` | Server-side Solana RPC service |
| `server/blockchain-config.ts` | Solana network & program configuration |
| `server/routes.ts` | All API endpoints |
| `server/storage.ts` | Database abstraction layer |
| `server/ipfs.ts` | Pinata IPFS integration |
| `shared/schema.ts` | Database schema (Drizzle ORM) |

### Supported Solana Networks

| Network | Cluster | RPC URL |
|---|---|---|
| Mainnet | mainnet-beta | https://api.mainnet-beta.solana.com |
| Devnet (default) | devnet | https://api.devnet.solana.com |
| Testnet | testnet | https://api.testnet.solana.com |

---

## Getting Started Guide

### Prerequisites
1. **Phantom Wallet**: Install from [phantom.app](https://phantom.app/download) (browser extension or mobile app)
2. **Solana wallet**: Fund your wallet with SOL (devnet SOL is free via airdrop)
3. **Node.js 20+**: Required for running the application

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/healthguardx

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### Connecting Your Wallet

1. Open HealthGuardX in your browser
2. Click **"Connect Wallet"** in the top-right corner
3. If using mobile, tap **"Open in Phantom App"** and follow the prompts
4. Approve the connection request in Phantom
5. Your Solana public key is now your HealthGuardX identity

### Testing on Devnet

The app defaults to Solana **Devnet**. You can get free devnet SOL:
```bash
# Using Solana CLI
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet

# Or use the Phantom wallet's built-in devnet faucet
```

### Mobile Access (Phantom Mobile App)

1. Download the [Phantom app](https://phantom.app/download)
2. Visit HealthGuardX on any browser and tap "Open in Phantom App"
3. Phantom opens the page in its built-in browser
4. Approve the connection — all features are fully supported on mobile

---

## Architecture Notes

### Why Solana?

- **Speed**: 400ms block times vs. 15+ seconds on Ethereum
- **Cost**: Transaction fees of ~$0.00025 vs. $1–$50+ on Ethereum
- **Scalability**: 65,000+ TPS capacity
- **Ecosystem**: Rich DeFi and NFT ecosystem with strong tooling

### Why Phantom?

- **Most popular** Solana wallet with 10M+ users
- **Mobile-first** design with excellent UX
- **Security**: Industry-leading key management
- **Open source**: Community-audited code

---

*HealthGuardX — Built on Solana | Secure • Decentralized • Patient-Owned*
*© 2025 HealthGuardX. All rights reserved.*
