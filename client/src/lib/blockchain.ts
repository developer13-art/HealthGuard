import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import { uint8ArrayToBase64 } from "@/lib/encoding";

export type SolanaCluster = "mainnet-beta" | "devnet" | "testnet";

export const SUPPORTED_NETWORKS = {
  mainnet: {
    cluster: "mainnet-beta" as SolanaCluster,
    chainName: "Solana",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://rpc.ankr.com/solana",
    blockExplorerUrl: "https://explorer.solana.com",
  },
  devnet: {
    cluster: "devnet" as SolanaCluster,
    chainName: "Solana Devnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.devnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  },
  testnet: {
    cluster: "testnet" as SolanaCluster,
    chainName: "Solana Testnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.testnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=testnet",
  },
} as const;

export type SolanaNetwork = keyof typeof SUPPORTED_NETWORKS;

export const getDefaultNetwork = (): SolanaNetwork => {
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem("selectedNetwork");
    if (stored && stored in SUPPORTED_NETWORKS) return stored as SolanaNetwork;
  }
  return "mainnet";
};

export const DEFAULT_NETWORK = getDefaultNetwork();

export const PROGRAM_IDS = {
  users: "11111111111111111111111111111111",
  medical: "11111111111111111111111111111111",
  treatments: "11111111111111111111111111111111",
  insurance: "11111111111111111111111111111111",
  payments: "11111111111111111111111111111111",
} as const;

function getPhantomProvider(): any {
  if (typeof window === "undefined") return null;
  if ("phantom" in window) {
    const provider = (window as any).phantom?.solana;
    if (provider?.isPhantom) return provider;
  }
  if ("solana" in window) {
    const provider = (window as any).solana;
    if (provider?.isPhantom) return provider;
  }
  return null;
}

export class SolanaBlockchainClient {
  private connection: Connection;
  private publicKey: PublicKey | null = null;
  private currentNetwork: SolanaNetwork = DEFAULT_NETWORK;

  constructor(network: SolanaNetwork = DEFAULT_NETWORK) {
    this.currentNetwork = network;
    const rpcUrl = SUPPORTED_NETWORKS[network].rpcUrl;
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async connect(network?: SolanaNetwork): Promise<string> {
    const provider = getPhantomProvider();
    if (!provider) {
      throw new Error("Phantom wallet not installed");
    }

    if (network && network !== this.currentNetwork) {
      this.currentNetwork = network;
      this.connection = new Connection(SUPPORTED_NETWORKS[network].rpcUrl, "confirmed");
    }

    const resp = await provider.connect();
    this.publicKey = resp.publicKey;
    const address = this.publicKey!.toString();

    const balance = await this.connection.getBalance(this.publicKey!);
    const network_ = SUPPORTED_NETWORKS[this.currentNetwork];
    console.log(`Wallet: ${address}, Balance: ${balance / LAMPORTS_PER_SOL} ${network_.nativeCurrency.symbol}`);

    return address;
  }

  getCurrentNetwork(): SolanaNetwork {
    return this.currentNetwork;
  }

  async switchNetwork(network: SolanaNetwork) {
    this.currentNetwork = network;
    this.connection = new Connection(SUPPORTED_NETWORKS[network].rpcUrl, "confirmed");
  }

  getConnection(): Connection {
    return this.connection;
  }

  getPublicKey(): PublicKey | null {
    return this.publicKey;
  }

  getSupportedNetworks() {
    return SUPPORTED_NETWORKS;
  }

  async signMessage(message: string): Promise<string> {
    const provider = getPhantomProvider();
    if (!provider) throw new Error("Phantom wallet not connected");

    const encodedMessage = new TextEncoder().encode(message);
    const { signature } = await provider.signMessage(encodedMessage, "utf8");
    return uint8ArrayToBase64(signature);
  }

  async getBalance(address?: string): Promise<number> {
    const pubKey = address ? new PublicKey(address) : this.publicKey;
    if (!pubKey) throw new Error("No wallet connected");
    const balance = await this.connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async sendSOL(toAddress: string, amountSOL: number): Promise<string> {
    const provider = getPhantomProvider();
    if (!provider || !this.publicKey) throw new Error("Phantom wallet not connected");

    const toPubKey = new PublicKey(toAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.publicKey,
        toPubkey: toPubKey,
        lamports: Math.round(amountSOL * LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.publicKey;

    const signedTx = await provider.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signedTx.serialize());
    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  generateSignatureHash(): string {
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }

  getExplorerUrl(signature: string): string {
    const network = SUPPORTED_NETWORKS[this.currentNetwork];
    const cluster = this.currentNetwork !== "mainnet" ? `?cluster=${this.currentNetwork}` : "";
    return `${network.blockExplorerUrl}/tx/${signature}${cluster}`;
  }
}

export const blockchainClient = new SolanaBlockchainClient();
