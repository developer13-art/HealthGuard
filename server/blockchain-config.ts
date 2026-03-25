// Smart Contract Addresses and Configuration
export const CONTRACT_ADDRESSES = {
  users: "0x7ddd2eb4ece89825096367fd6f72623996ad1a55",
  medical: "0x33b7b70a1a20233b441527a7cd5b43c791d78860",
  treatments: "0x865f4b7835cffad383d33211033ea3b747010cd8",
  insurance: "0xeaa1afa47136f28828464a69e21046da8706c635",
  payments: "0x479a9cd7bee5a12333ae3f44ad7b960aaf479278ffcb733cf3f4f80d00f465ae",
} as const;

// Multi-chain Network Configuration
export const SUPPORTED_NETWORKS = {
  ethereum: {
    chainId: 1,
    chainIdHex: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo",
    blockExplorerUrl: "https://etherscan.io"
  },
  sepolia: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
    blockExplorerUrl: "https://sepolia.etherscan.io"
  },
  polygon: {
    chainId: 137,
    chainIdHex: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    blockExplorerUrl: "https://polygonscan.com"
  },
  polygonMumbai: {
    chainId: 80001,
    chainIdHex: "0x13881",
    chainName: "Polygon Mumbai",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrl: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
    blockExplorerUrl: "https://mumbai.polygonscan.com"
  },
  blockdagAwakening: {
    chainId: 1043,
    chainIdHex: "0x413",
    chainName: "BlockDAG Awakening",
    nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 },
    rpcUrl: process.env.BLOCKDAG_RPC_URL || "https://rpc.awakening.bdagscan.com",
    blockExplorerUrl: "https://awakening.bdagscan.com"
  },
} as const;

// Get default network (prefer Sepolia for testnet, fallback to blockDAG)
export const DEFAULT_NETWORK = (process.env.BLOCKCHAIN_NETWORK || "blockdagAwakening") as keyof typeof SUPPORTED_NETWORKS;

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = SUPPORTED_NETWORKS[DEFAULT_NETWORK];

// Gas configuration (EIP-1559 for Ethereum-compatible chains)
export const GAS_CONFIG = {
  gasLimit: 500000,
  maxFeePerGas: undefined, // Let provider estimate
  maxPriorityFeePerGas: undefined, // Let provider estimate
};
