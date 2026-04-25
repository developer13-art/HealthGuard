export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

export const SOLANA_NETWORKS = {
  mainnet: {
    cluster: "mainnet-beta" as SolanaCluster,
    chainName: "Solana Mainnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    blockExplorerUrl: "https://explorer.solana.com",
  },
  devnet: {
    cluster: "devnet" as SolanaCluster,
    chainName: "Solana Devnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  },
  testnet: {
    cluster: "testnet" as SolanaCluster,
    chainName: "Solana Testnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: process.env.SOLANA_TESTNET_RPC_URL || "https://api.testnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=testnet",
  },
} as const;

export type SolanaNetwork = keyof typeof SOLANA_NETWORKS;

export const DEFAULT_NETWORK: SolanaNetwork = (
  (process.env.SOLANA_NETWORK || "devnet") in SOLANA_NETWORKS
    ? process.env.SOLANA_NETWORK
    : "devnet"
) as SolanaNetwork;

export const BLOCKCHAIN_CONFIG = SOLANA_NETWORKS[DEFAULT_NETWORK];

export const PROGRAM_IDS = {
  users: process.env.PROGRAM_ID_USERS || "11111111111111111111111111111111",
  medical: process.env.PROGRAM_ID_MEDICAL || "11111111111111111111111111111111",
  treatments: process.env.PROGRAM_ID_TREATMENTS || "11111111111111111111111111111111",
  insurance: process.env.PROGRAM_ID_INSURANCE || "11111111111111111111111111111111",
  payments: process.env.PROGRAM_ID_PAYMENTS || "11111111111111111111111111111111",
} as const;
