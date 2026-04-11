# HealthGuardX — Full Technical & User Documentation

> **Built on Solana · Powered by Phantom Wallet · Secured by IPFS**
> © 2025 HealthGuardX. All rights reserved.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Technology Stack](#2-technology-stack)
3. [Wallet Integration — Phantom](#3-wallet-integration--phantom)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Feature Walkthroughs](#8-feature-walkthroughs)
9. [Blockchain & Solana Integration](#9-blockchain--solana-integration)
10. [IPFS / Pinata Integration](#10-ipfs--pinata-integration)
11. [Security Model](#11-security-model)
12. [Environment Variables](#12-environment-variables)
13. [Project Structure](#13-project-structure)
14. [Running & Deploying](#14-running--deploying)
15. [Admin Guide](#15-admin-guide)
16. [Testing Guide](#16-testing-guide)
17. [FAQ & Troubleshooting](#17-faq--troubleshooting)

---

## 1. Introduction

**HealthGuardX** is a decentralized healthcare identity platform that gives patients full ownership and control of their medical records. It integrates the Solana blockchain for audit trails and cryptographic proof, Phantom wallet for passwordless authentication, and IPFS for permanent, decentralized file storage.

### Core Problems Solved

| Problem | How HealthGuardX Solves It |
|---|---|
| Lost / inaccessible medical records | Permanent IPFS storage, accessible via QR code 24/7 |
| Slow, fraudulent insurance claims | Solana-verified claims with cryptographic signatures |
| Password-based identity theft | Phantom wallet — your private key is your identity |
| Emergency access delays | QR code gives read-only critical info instantly |
| Data siloed in hospitals | Patient owns data, grants per-provider access |

---

## 2. Technology Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| UI Library | Shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v3 |
| Data Fetching | TanStack Query (React Query v5) |
| Routing | Wouter |
| Blockchain | `@solana/web3.js` |
| Wallet | Phantom (via `window.phantom.solana`) |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript |
| Server | Express.js 4 |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon serverless) |
| Sessions | express-session + MemoryStore |
| Scheduler | node-cron |
| IPFS | Pinata API |
| Blockchain | `@solana/web3.js` (read-only RPC) |

---

## 3. Wallet Integration — Phantom

### How Phantom Connects

Phantom is detected differently depending on the user's environment:

```
┌─────────────────────────────────────┐
│          User opens HealthGuardX    │
└─────────────────┬───────────────────┘
                  │
       ┌──────────▼──────────┐
       │  Is window.phantom  │
       │  .solana injected?  │
       └──────────┬──────────┘
         YES      │          NO
          │       │           │
          │    ┌──▼──┐     ┌──▼──────────────┐
          │    │ Is  │     │ Is the user on  │
          │    │ mob │     │  mobile?        │
          │    └──┬──┘     └──┬─────────────┘
          │    YES│         YES│           NO
          │       │            │            │
   ┌──────▼──┐  ┌─▼────────┐ ┌▼─────────┐ ┌▼──────────────┐
   │ Desktop │  │ Inside   │ │ Redirect │ │ Show "Install │
   │ ext.    │  │ Phantom  │ │ to       │ │ Phantom"      │
   │ connect │  │ browser  │ │ Phantom  │ │ button        │
   │ normal  │  │ normal   │ │ deep link│ └───────────────┘
   └─────────┘  └──────────┘ └──────────┘
```

### Connection Modes

| Mode | Description | How it's detected |
|---|---|---|
| `extension` | Phantom browser extension (desktop) or Phantom in-app browser (mobile) | `window.phantom?.solana?.isPhantom === true` |
| `mobile-app` | User is on mobile without Phantom injected | `detectMobile() && !getPhantomProvider()` |
| `not-available` | Desktop, no extension installed | `!isMobile && !getPhantomProvider()` |

### Mobile Deep Link

When a user is on a mobile device without Phantom's browser, the app redirects to:
```
https://phantom.app/ul/browse/<encoded-url>?ref=<encoded-origin>
```
This opens the current page inside Phantom's built-in browser, where `window.solana` is automatically injected.

### Phantom SDK Methods Used

```typescript
// Detect provider
const provider = window.phantom?.solana ?? window.solana;

// Connect (returns PublicKey)
const { publicKey } = await provider.connect();
const address = publicKey.toString(); // base58 Solana address

// Disconnect
await provider.disconnect();

// Sign a message (for payment auth, identity proofs)
const encoded = new TextEncoder().encode(message);
const { signature } = await provider.signMessage(encoded, "utf8");
const sigBase64 = Buffer.from(signature).toString("base64");

// Listen for account changes
provider.on("accountChanged", (publicKey) => { ... });
provider.off("accountChanged", handler);
```

### Authentication Flow

1. User clicks **Connect Wallet**
2. Phantom prompts for connection approval
3. Returns `publicKey` (Solana base58 address ~44 chars)
4. App calls `POST /api/auth/connect` with `{ walletAddress }`
5. Server finds or creates user record, returns `{ uid, role, status }`
6. Session data persisted in `localStorage` and React state
7. User redirected to their role dashboard

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  React + Vite + TanStack Query + @solana/web3.js                 │
│  Phantom Wallet (window.solana / window.phantom.solana)          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / WebSocket (HMR in dev)
┌────────────────────────────▼─────────────────────────────────────┐
│                     Express.js Server (port 5000)                │
│  • Serves Vite dev middleware (dev) / static files (prod)        │
│  • REST API routes (/api/*)                                      │
│  • Session middleware (express-session)                          │
│  • Billing scheduler (node-cron)                                 │
└──────────┬──────────────────┬──────────────────┬─────────────────┘
           │                  │                  │
    ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────────┐
    │  PostgreSQL │   │  Solana RPC  │   │  Pinata IPFS    │
    │  (Neon)     │   │  (Devnet/    │   │  (file storage) │
    │  Primary DB │   │   Mainnet)   │   │                 │
    └─────────────┘   └──────────────┘   └─────────────────┘
```

### Dev vs Production
- **Development**: `npm run dev` → `tsx server/index.ts` → Express + Vite middleware, port 5000
- **Production**: `npm run build` → `vite build` + `esbuild server` → `npm run start` → static files served by Express

---

## 5. Database Schema

Tables defined in `shared/schema.ts` using Drizzle ORM:

### `users`
| Column | Type | Description |
|---|---|---|
| id | serial PK | Auto-increment |
| uid | varchar(50) UNIQUE | System-generated health ID |
| walletAddress | varchar(100) UNIQUE | Solana public key (base58) |
| username | varchar(100) | Display name |
| role | enum | patient, doctor, hospital, emergency_responder, insurance_provider, admin |
| status | enum | pending, verified, rejected, suspended |
| createdAt | timestamp | Registration timestamp |
| lastLogin | timestamp | Last activity |

### `medicalRecords`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| patientId | FK → users | Record owner |
| recordType | varchar | diagnosis, prescription, lab_result, etc. |
| ipfsCid | varchar | IPFS content identifier |
| fileHash | varchar | SHA-256 for integrity check |
| encryptedKey | text | Encrypted decryption key |
| uploadedAt | timestamp | |

### `accessGrants`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| patientId | FK → users | Who grants access |
| granteeId | FK → users | Who receives access |
| expiresAt | timestamp | Revocation deadline |
| isActive | boolean | Can be revoked immediately |

### `kycSubmissions`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | |
| documentCid | varchar | IPFS CID of uploaded KYC document |
| status | enum | pending, approved, rejected |
| reviewedBy | FK → users | Admin who reviewed |
| reviewedAt | timestamp | |

### `insurancePolicies`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| patientId | FK → users | |
| providerId | FK → users | |
| policyNumber | varchar UNIQUE | |
| coverageLimit | numeric | |
| monthlyFee | numeric | |
| status | enum | active, cancelled, expired |

### `insuranceClaims`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| policyId | FK → insurancePolicies | |
| hospitalId | FK → users | |
| amount | numeric | Claimed amount |
| status | enum | pending, approved, rejected, paid |
| treatmentCid | varchar | IPFS CID of treatment evidence |

### `subscriptionPayments`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | |
| role | varchar | Role applying for |
| transactionHash | varchar | Phantom signature hash |
| amount | varchar | Amount paid |
| paidAt | timestamp | |
| expiresAt | timestamp | 1 year from payment |

### `auditLogs`
| Column | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | Who performed action |
| action | varchar | Action type |
| resourceType | varchar | What was acted on |
| resourceId | varchar | |
| details | jsonb | Extra metadata |
| timestamp | timestamp | |

---

## 6. API Reference

### Auth

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/auth/connect` | `{ walletAddress }` | `{ uid, role, status, suspendedUntil }` |
| POST | `/api/auth/disconnect` | — | `{ success }` |
| GET | `/api/auth/me` | — | current user object |

### Patient

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/patient/profile` | Get patient profile |
| PUT | `/api/patient/profile` | Update profile |
| GET | `/api/patient/records` | List medical records |
| POST | `/api/patient/records` | Upload new record |
| GET | `/api/patient/access-grants` | List who has access |
| POST | `/api/patient/grant-access` | Grant access to provider |
| DELETE | `/api/patient/revoke-access/:id` | Revoke access |
| GET | `/api/patient/insurance` | Insurance connections |
| POST | `/api/patient/subscription-payment` | Record subscription payment |
| POST | `/api/patient/apply-role` | Apply for professional role |
| GET | `/api/patient/qr-data` | QR code payload |
| GET | `/api/patient/audit` | Audit log |

### Doctor

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/doctor/patients` | Patients with granted access |
| GET | `/api/doctor/treatments` | All treatments created |
| POST | `/api/doctor/treatments` | Create treatment log |
| GET | `/api/doctor/consultations` | Consultation requests |
| POST | `/api/doctor/consultations/:id/respond` | Respond to consultation |
| GET | `/api/doctor/profile` | Doctor profile |

### Hospital

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hospital/patients` | Patients under hospital |
| GET | `/api/hospital/claims` | Insurance claims |
| POST | `/api/hospital/claims` | Submit new claim |
| GET | `/api/hospital/invoices` | Invoices |
| POST | `/api/hospital/invoices` | Create invoice |
| GET | `/api/hospital/access-requests` | Pending access requests |
| POST | `/api/hospital/access-requests/:id/respond` | Approve/reject request |

### Insurance Provider

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/insurance/claims` | Claims to review |
| PUT | `/api/insurance/claims/:id` | Approve/reject claim |
| GET | `/api/insurance/policies` | All policies |
| POST | `/api/insurance/policies` | Create policy |
| GET | `/api/insurance/analytics` | Analytics dashboard data |
| GET | `/api/insurance/payments` | Payment history |

### Emergency Responder

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/emergency/scan` | Decode QR and fetch patient data |
| GET | `/api/emergency/patients` | Scan history |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | All users |
| PUT | `/api/admin/users/:id/role` | Change user role |
| PUT | `/api/admin/users/:id/status` | Change user status |
| GET | `/api/admin/kyc` | KYC submissions |
| PUT | `/api/admin/kyc/:id` | Approve/reject KYC |
| GET | `/api/admin/role-applications` | Role applications |
| PUT | `/api/admin/role-applications/:id` | Approve/reject |
| GET | `/api/admin/audit` | Full audit log |
| GET | `/api/admin/settings` | System settings |

### Public

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/public/hospitals` | List all verified hospitals |
| GET | `/api/public/emergency/:uid` | Emergency read-only patient data |

---

## 7. User Roles & Permissions

| Role | Default | Description |
|---|---|---|
| `patient` | ✅ Auto-assigned | Every new wallet gets this |
| `doctor` | ❌ Apply | Must apply + admin approve |
| `hospital` | ❌ Apply + Pay | Annual subscription + admin approve |
| `emergency_responder` | ❌ Apply | Must apply + admin approve |
| `insurance_provider` | ❌ Apply + Pay | Annual subscription + admin approve |
| `admin` | ❌ Hardcoded | Set directly in server/routes.ts |

### Permission Matrix

| Feature | Patient | Doctor | Hospital | Emergency | Insurance | Admin |
|---|---|---|---|---|---|---|
| View own records | ✅ | — | — | — | — | ✅ |
| Upload records | ✅ | — | — | — | — | — |
| View granted patient records | — | ✅ | ✅ | ✅ (QR) | — | — |
| Create treatments | — | ✅ | — | — | — | — |
| Submit claims | — | — | ✅ | — | — | — |
| Approve/reject claims | — | — | — | — | ✅ | — |
| Review KYC | — | — | — | — | — | ✅ |
| Manage users | — | — | — | — | — | ✅ |
| Emergency scan | — | — | — | ✅ | — | — |

---

## 8. Feature Walkthroughs

### 8.1 Patient Onboarding

1. **Install Phantom**
   - Desktop: Install [Phantom extension](https://phantom.app/download) for Chrome, Firefox, Edge or Brave
   - Mobile: Install [Phantom app](https://phantom.app/download) (iOS / Android)

2. **Connect Wallet**
   - Desktop: Click **Connect Wallet** → Approve in extension popup
   - Mobile (Phantom browser): Open HealthGuardX URL inside Phantom → tap Connect
   - Mobile (regular browser): Tap **Open in Phantom App** → approve in Phantom

3. **First Login**
   - New wallet → automatically registered as `patient` role
   - Status: `pending` until KYC is approved by admin

4. **Complete KYC**
   - Navigate to Profile → Upload government ID / verification document
   - Document uploaded to IPFS via Pinata
   - Admin reviews and approves/rejects

5. **Start Using the Platform**
   - Upload medical records (encrypted, stored on IPFS)
   - Generate QR code for emergency access
   - Apply for professional roles if needed

### 8.2 Medical Records

- All uploads are **encrypted client-side** before transmission
- Encrypted file stored on IPFS via Pinata; CID stored in database
- SHA-256 hash stored for integrity verification
- Only patients with granted access can decrypt

### 8.3 QR Code Emergency Access

1. Patient generates QR from Patient → QR Code page
2. QR encodes a signed URL with the patient's UID
3. Emergency responder scans QR
4. App calls `POST /api/emergency/scan` with the UID
5. Returns: blood type, allergies, current medications, emergency contacts
6. No login required for responder — read-only, time-limited

### 8.4 Insurance Claims Flow

```
Hospital submits claim → Insurance provider reviews → Admin notified
       ↓                           ↓
  Treatment CID              Approve / Reject
  uploaded to IPFS               ↓
                           Payment recorded
                           Blockchain audit log updated
```

### 8.5 Role Applications

| Role | Steps |
|---|---|
| Doctor | Apply → Fill license + hospital → Admin approves |
| Emergency Responder | Apply → Fill license + hospital → Admin approves |
| Hospital | Pay subscription (Phantom signature) → Fill details → Admin approves |
| Insurance Provider | Pay subscription (Phantom signature) → Fill details → Admin approves |

### 8.6 Billing Scheduler

- Runs every 6 hours in development, monthly in production
- Checks subscription expiry dates
- Marks expired subscriptions as inactive
- Notifies relevant users

---

## 9. Blockchain & Solana Integration

### Why Solana?

| Metric | Solana | Ethereum |
|---|---|---|
| Block time | ~400ms | ~12s |
| Tx fee | ~$0.00025 | $1–$50+ |
| TPS | 65,000+ | ~15 |
| Ecosystem | Rich DeFi/NFT | Largest |

### Network Configuration (`server/blockchain-config.ts`)

```typescript
export const SOLANA_NETWORKS = {
  mainnet: { rpcUrl: "https://api.mainnet-beta.solana.com", ... },
  devnet:  { rpcUrl: "https://api.devnet.solana.com", ... },   // default
  testnet: { rpcUrl: "https://api.testnet.solana.com", ... },
};
```

Set `SOLANA_NETWORK=mainnet` in `.env` to switch networks.

### Client Blockchain Class (`client/src/lib/blockchain.ts`)

```typescript
import { SolanaBlockchainClient } from "@/lib/blockchain";

const client = new SolanaBlockchainClient("devnet");

// Connect Phantom and get address
const address = await client.connect();

// Get SOL balance
const balance = await client.getBalance(address); // returns SOL (float)

// Sign a message (payment authorization)
const sig = await client.signMessage("HealthGuardX auth: timestamp");

// Send SOL (for future on-chain payments)
const txSignature = await client.sendSOL("recipient_address", 0.01);
```

### Server Blockchain Service (`server/blockchain.ts`)

The server uses `@solana/web3.js` in read-only mode:
- Verifies wallet address validity (base58)
- Reads on-chain account balances
- Could verify transaction signatures against RPC
- Generates audit hashes for logging

### Solana Address Format

Solana addresses are **base58-encoded** Ed25519 public keys:
- Example: `HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH`
- Length: 32–44 characters
- **Different from EVM hex addresses** (`0x...`)

---

## 10. IPFS / Pinata Integration

### Setup

1. Create an account at [pinata.cloud](https://www.pinata.cloud)
2. Generate API keys (API Key + Secret Key)
3. Set in `.env`:
   ```env
   PINATA_API_KEY=your_api_key
   PINATA_SECRET_KEY=your_secret_key
   ```

### What Gets Stored on IPFS

| Data | Upload Method | Metadata |
|---|---|---|
| KYC documents | File upload (base64) | `{ userId, type: "kyc" }` |
| Medical records | File upload (base64) | `{ patientId, recordType }` |
| Treatment logs | JSON upload | `{ doctorId, patientId }` |
| Emergency QR payloads | JSON upload | `{ uid }` |

### Fallback

If Pinata is not configured, the system falls back to **simulated IPFS** — generates a mock CID for development/testing. Set both `PINATA_API_KEY` and `PINATA_SECRET_KEY` for real IPFS storage.

### Retrieving Files

All IPFS files are accessible via the Pinata gateway:
```
https://gateway.pinata.cloud/ipfs/<CID>
```

---

## 11. Security Model

### Threat Model

| Threat | Mitigation |
|---|---|
| Phishing / account takeover | Phantom wallet: private key never leaves browser |
| SQL injection | Drizzle ORM parameterized queries |
| XSS | React's inherent output escaping |
| CSRF | Session tokens + same-origin checks |
| Medical record eavesdropping | Client-side AES-256 encryption before upload |
| Unauthorized record access | Access grant system with expiry + revocation |
| Replay attacks | Timestamp included in signed messages |
| Subscription fraud | Phantom signature hash stored and verified |

### Session Management

- Sessions stored in Express MemoryStore (dev) / connect-pg-simple (prod-ready)
- Session tied to wallet address — logout clears both server session and localStorage
- No passwords stored — authentication = wallet address ownership

### Admin Access

Admin wallets are hardcoded in `server/routes.ts`:
```typescript
const isAdmin = user.role === "admin";
```
To add yourself as admin, find your Solana public key from Phantom settings and update `server/routes.ts` accordingly.

---

## 12. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | — | Neon PostgreSQL connection string |
| `PINATA_API_KEY` | ⚠️ Optional | — | Pinata IPFS API key |
| `PINATA_SECRET_KEY` | ⚠️ Optional | — | Pinata IPFS secret key |
| `SOLANA_NETWORK` | No | `devnet` | `mainnet` / `devnet` / `testnet` |
| `SOLANA_RPC_URL` | No | Public RPC | Custom Solana RPC endpoint |
| `SOLANA_DEVNET_RPC_URL` | No | Public | Devnet RPC override |
| `SOLANA_TESTNET_RPC_URL` | No | Public | Testnet RPC override |
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | `development` / `production` |
| `SESSION_SECRET` | No | auto | Express session secret |

---

## 13. Project Structure

```
healthguardx/
├── client/                    # React frontend
│   └── src/
│       ├── App.tsx            # Route definitions
│       ├── main.tsx           # Entry point
│       ├── index.css          # Global styles
│       ├── components/        # Shared UI components
│       │   ├── WalletButton.tsx
│       │   ├── AppSidebar.tsx
│       │   ├── QRGeneratorCard.tsx
│       │   ├── QRScanner.tsx
│       │   └── ui/            # Shadcn/ui primitives
│       ├── contexts/
│       │   ├── WalletContext.tsx  # Phantom wallet state
│       │   └── ThemeProvider.tsx
│       ├── hooks/
│       │   ├── use-toast.ts
│       │   └── use-mobile.tsx
│       ├── lib/
│       │   ├── blockchain.ts  # SolanaBlockchainClient
│       │   ├── queryClient.ts # TanStack Query config
│       │   └── utils.ts
│       └── pages/
│           ├── Landing.tsx
│           ├── patient/       # Patient dashboard pages
│           ├── doctor/        # Doctor dashboard pages
│           ├── hospital/      # Hospital dashboard pages
│           ├── emergency/     # Emergency responder pages
│           ├── insurance/     # Insurance provider pages
│           └── admin/         # Admin panel pages
│
├── server/                    # Express backend
│   ├── index.ts               # App entry + startup
│   ├── routes.ts              # All API endpoints (4000+ lines)
│   ├── storage.ts             # DB abstraction layer
│   ├── db.ts                  # Drizzle + Neon connection
│   ├── blockchain.ts          # Solana RPC service
│   ├── blockchain-config.ts   # Solana network config
│   ├── ipfs.ts                # Pinata IPFS service
│   ├── billing-scheduler.ts   # Cron billing jobs
│   └── vite.ts                # Vite dev middleware
│
├── shared/
│   └── schema.ts              # Drizzle schema (shared types)
│
├── abis/                      # Legacy EVM ABIs (kept for reference)
├── contracts/                 # Legacy Solidity contracts (reference)
├── migrations/                # SQL migration files
├── scripts/                   # Dev utility scripts
│
├── vite.config.ts             # Vite + Replit plugin config
├── drizzle.config.ts          # Drizzle Kit config
├── tailwind.config.ts         # Tailwind config
├── tsconfig.json              # TypeScript config
├── package.json               # Dependencies & scripts
├── .env                       # Environment variables
├── README.md                  # Project overview
└── DOCUMENTATION.md           # This file
```

---

## 14. Running & Deploying

### Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 3. Push database schema
npm run db:push

# 4. Start development server (port 5000)
npm run dev
```

Vite HMR is active — frontend changes reload instantly. Server changes require restart.

### Production Build

```bash
# Build frontend + bundle server
npm run build

# Start production server
npm run start
```

### Database Management

```bash
npm run db:push      # Apply schema changes (dev)
npm run db:migrate   # Run migration files
npm run db:test      # Test DB connection
```

### Deployment (Replit)

1. The app auto-deploys from the `Start application` workflow
2. Production uses `npm run build && npm run start`
3. Port 5000 is automatically exposed

---

## 15. Admin Guide

### Becoming an Admin

1. Find your Solana public key in Phantom → Settings → Account
2. Open `server/routes.ts` and search for the admin wallet check
3. Add your address:
   ```typescript
   const ADMIN_WALLETS = [
     "existing_admin_address",
     "YOUR_SOLANA_ADDRESS_HERE",
   ];
   ```
4. Restart the server
5. Connect Phantom with your wallet — you'll be auto-redirected to `/admin`

### Admin Actions

| Action | Where |
|---|---|
| Approve/Reject KYC | Admin → KYC Management |
| Approve/Reject role applications | Admin → Role Applications |
| Suspend/unsuspend users | Admin → Users → Actions |
| View all audit logs | Admin → Audit Log |
| Change user roles | Admin → Users → Edit Role |
| View system settings | Admin → Settings |

### Notifications

Contact: abdurrazaqiliyaa@gmail.com
Hotline: +2349123302285 / +2348142241819

---

## 16. Testing Guide

### Wallet Testing on Devnet

1. Install Phantom and switch to **Devnet** network in settings
2. Get free devnet SOL from [faucet.solana.com](https://faucet.solana.com)
3. Connect to HealthGuardX — use devnet address as health identity

### Role Testing

| Scenario | Steps |
|---|---|
| New patient | Fresh Phantom wallet → connect → auto-registered as patient |
| Doctor | Apply for role → notify admin → get approved |
| Hospital | Apply + pay subscription (sign message in Phantom) → admin approves |
| Admin | Hardcode wallet address in routes.ts → connect |
| Emergency | Apply → get approved → use QR scanner page |

### Manual Test Checklist

- [ ] Connect Phantom (desktop extension)
- [ ] Connect Phantom (mobile — open in Phantom browser)
- [ ] Register as new patient
- [ ] Upload a medical record
- [ ] Generate QR code
- [ ] Scan QR code as emergency responder
- [ ] Submit KYC document
- [ ] Apply for a role
- [ ] Admin: approve KYC
- [ ] Admin: approve role application
- [ ] Hospital: submit insurance claim
- [ ] Insurance: approve/reject claim
- [ ] Patient: pay insurance premium (sign with Phantom)

---

## 17. FAQ & Troubleshooting

### Q: Phantom is installed but "not found" error appears

**A:** Make sure the Phantom extension is enabled in your browser. Open Phantom popup, unlock it, then refresh HealthGuardX.

### Q: Mobile connection not working

**A:** Open this URL inside the Phantom app's built-in browser (tap the globe/browser icon inside Phantom). Alternatively, tap "Open in Phantom App" on the landing page.

### Q: "Server error during authentication"

**A:** The DATABASE_URL may be incorrect or expired. Check your `.env` file.

### Q: IPFS upload fails

**A:** Check `PINATA_API_KEY` and `PINATA_SECRET_KEY` in `.env`. The app falls back to simulated storage if Pinata is not configured.

### Q: How do I reset my wallet / start fresh?

**A:** localStorage stores your session. In browser DevTools → Application → LocalStorage → delete all HealthGuardX keys and refresh.

### Q: How do I add another admin?

**A:** See [Admin Guide](#15-admin-guide) — add the Solana address to the admin check in `server/routes.ts`.

### Q: Can I use a hardware wallet?

**A:** Phantom supports Ledger. Pair your Ledger with Phantom, then connect normally. All signing happens through Ledger.

### Q: Transaction signing failed / rejected

**A:** The user clicked "Reject" in Phantom. This is expected behaviour — prompt the user to try again and approve in Phantom.

---

*HealthGuardX — Built on Solana · Phantom Wallet · IPFS · PostgreSQL*
*For support: abdurrazaqiliyaa@gmail.com*
