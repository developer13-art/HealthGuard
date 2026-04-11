import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const SOLANA_NETWORKS = {
  mainnet: {
    cluster: "mainnet-beta",
    chainName: "Solana Mainnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.mainnet-beta.solana.com",
    blockExplorerUrl: "https://explorer.solana.com",
  },
  devnet: {
    cluster: "devnet",
    chainName: "Solana Devnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.devnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=devnet",
  },
  testnet: {
    cluster: "testnet",
    chainName: "Solana Testnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    rpcUrl: "https://api.testnet.solana.com",
    blockExplorerUrl: "https://explorer.solana.com?cluster=testnet",
  },
};

export const DEFAULT_NETWORK = "devnet";

export const PROGRAM_IDS = {
  users: "11111111111111111111111111111111",
  medical: "11111111111111111111111111111111",
  treatments: "11111111111111111111111111111111",
  insurance: "11111111111111111111111111111111",
  payments: "11111111111111111111111111111111",
};

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  if ("phantom" in window) {
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) return provider;
  }
  if ("solana" in window) {
    const provider = window.solana;
    if (provider?.isPhantom) return provider;
  }
  return null;
}

export class SolanaBlockchainClient {
  constructor(network = DEFAULT_NETWORK) {
    this.currentNetwork = network;
    this.connection = new Connection(SOLANA_NETWORKS[network].rpcUrl, "confirmed");
    this.publicKey = null;
  }

  async connect(network) {
    const provider = getPhantomProvider();
    if (!provider) {
      throw new Error("Phantom wallet not installed");
    }
    if (network && network !== this.currentNetwork) {
      this.currentNetwork = network;
      this.connection = new Connection(SOLANA_NETWORKS[network].rpcUrl, "confirmed");
    }
    const resp = await provider.connect();
    this.publicKey = resp.publicKey;
    const address = this.publicKey.toString();
    const balance = await this.connection.getBalance(this.publicKey);
    console.log(`Wallet: ${address}, Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    return address;
  }

  async signMessage(message) {
    const provider = getPhantomProvider();
    if (!provider) throw new Error("Phantom wallet not connected");
    const encodedMessage = new TextEncoder().encode(message);
    const { signature } = await provider.signMessage(encodedMessage, "utf8");
    return Buffer.from(signature).toString("base64");
  }

  async getBalance(address) {
    const pubKey = address ? new PublicKey(address) : this.publicKey;
    if (!pubKey) throw new Error("No wallet connected");
    const balance = await this.connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async sendSOL(toAddress, amountSOL) {
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
}

export const blockchainClient = new SolanaBlockchainClient();
