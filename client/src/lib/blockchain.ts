import { ethers } from "ethers";

// Multi-chain Network configuration
export const SUPPORTED_NETWORKS = {
  ethereum: {
    chainId: 1,
    chainIdHex: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://etherscan.io"]
  },
  sepolia: {
    chainId: 11155111,
    chainIdHex: "0xaa36a7",
    chainName: "Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-sepolia.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"]
  },
  polygon: {
    chainId: 137,
    chainIdHex: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"]
  },
  polygonMumbai: {
    chainId: 80001,
    chainIdHex: "0x13881",
    chainName: "Polygon Mumbai",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
    blockExplorerUrls: ["https://mumbai.polygonscan.com"]
  },
  blockdagAwakening: {
    chainId: 1043,
    chainIdHex: "0x413",
    chainName: "BlockDAG Awakening",
    nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 },
    rpcUrls: ["https://rpc.awakening.bdagscan.com"],
    blockExplorerUrls: ["https://awakening.bdagscan.com"]
  }
} as const;

// Default network (allow override via environment or local storage)
export const getDefaultNetwork = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('selectedNetwork');
    if (stored && stored in SUPPORTED_NETWORKS) return stored as keyof typeof SUPPORTED_NETWORKS;
  }
  return "blockdagAwakening" as const;
};

export const DEFAULT_NETWORK = getDefaultNetwork();

// Contract addresses
export const CONTRACT_ADDRESSES = {
  users: "0x7ddd2eb4ece89825096367fd6f72623996ad1a55",
  medical: "0x33b7b70a1a20233b441527a7cd5b43c791d78860",
  treatments: "0x865f4b7835cffad383d33211033ea3b747010cd8",
  insurance: "0xeaa1afa47136f28828464a69e21046da8706c635",
  payments: "0x479a9cd7bee5a12333ae3f44ad7b960aaf479278ffcb733cf3f4f80d00f465ae",
} as const;

// Import ABIs (these will be imported as needed)
import usersABI from "@/../../abis/HealthGuardXUsers.json";
import medicalABI from "@/../../abis/HealthGuardXMedical.json";
import treatmentsABI from "@/../../abis/HealthGuardXTreatments.json";
import insuranceABI from "@/../../abis/HealthGuardXInsurance.json";
import paymentsABI from "@/../../abis/HealthGuardXPayments.json";

export class BlockchainClient {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private currentNetwork: keyof typeof SUPPORTED_NETWORKS = DEFAULT_NETWORK;

  async checkAndSwitchNetwork(networkName?: keyof typeof SUPPORTED_NETWORKS) {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const targetNetwork = networkName || this.currentNetwork || DEFAULT_NETWORK;
    const network = SUPPORTED_NETWORKS[targetNetwork];

    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainName = Object.entries(SUPPORTED_NETWORKS).find(
        ([_, n]) => n.chainIdHex === currentChainId
      )?.[0] || "unknown";
      
      console.log("Current network:", { chainId: currentChainId, name: currentChainName });

      if (currentChainId !== network.chainIdHex) {
        console.log(`Switching to ${network.chainName}...`);
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: network.chainIdHex }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            console.log("Network not found, adding it...");
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: network.chainIdHex,
                chainName: network.chainName,
                nativeCurrency: network.nativeCurrency,
                rpcUrls: network.rpcUrls,
                blockExplorerUrls: network.blockExplorerUrls,
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
      this.currentNetwork = targetNetwork;
    } catch (error) {
      console.error("Error checking/switching network:", error);
      throw error;
    }
  }

  async connect(networkName?: keyof typeof SUPPORTED_NETWORKS) {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    await this.checkAndSwitchNetwork(networkName);
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    
    const address = await this.signer.getAddress();
    const balance = await this.provider.getBalance(address);
    const network = SUPPORTED_NETWORKS[this.currentNetwork];
    console.log(`Wallet: ${address}, Balance: ${ethers.formatEther(balance)} ${network.nativeCurrency.symbol}`);
    
    return this.signer;
  }

  getCurrentNetwork(): keyof typeof SUPPORTED_NETWORKS {
    return this.currentNetwork;
  }

  async switchNetwork(networkName: keyof typeof SUPPORTED_NETWORKS) {
    await this.checkAndSwitchNetwork(networkName);
    if (this.provider) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
    }
  }

  getSupportedNetworks() {
    return SUPPORTED_NETWORKS;
  }

  async getContract(contractName: keyof typeof CONTRACT_ADDRESSES) {
    if (!this.signer) {
      await this.connect();
    }

    const abis = {
      users: usersABI,
      medical: medicalABI,
      treatments: treatmentsABI,
      insurance: insuranceABI,
      payments: paymentsABI,
    };

    return new ethers.Contract(
      CONTRACT_ADDRESSES[contractName],
      abis[contractName],
      this.signer!
    );
  }

  // User functions
  async registerUser(uid: string, username: string) {
    const contract = await this.getContract("users");
    const tx = await contract.registerUser(uid, username);
    return await tx.wait();
  }

  async submitKYC(documentCID: string) {
    const contract = await this.getContract("users");
    const tx = await contract.submitKYC(documentCID);
    return await tx.wait();
  }

  // Medical record functions
  async addMedicalRecord(recordId: string, recordCID: string, recordHash: string, recordType: string) {
    const contract = await this.getContract("medical");
    const tx = await contract.addRecord(recordId, recordCID, recordHash, recordType);
    return await tx.wait();
  }

  async grantAccess(requesterAddress: string, expiresAt: number) {
    const contract = await this.getContract("medical");
    const tx = await contract.grantAccess(requesterAddress, expiresAt);
    return await tx.wait();
  }

  async revokeAccess(requesterAddress: string) {
    const contract = await this.getContract("medical");
    const tx = await contract.revokeAccess(requesterAddress);
    return await tx.wait();
  }

  // Treatment functions
  async addTreatment(
    patientAddress: string,
    treatmentId: string,
    treatmentCID: string,
    diagnosis: string,
    prescription: string
  ) {
    const contract = await this.getContract("treatments");
    const tx = await contract.addTreatment(
      patientAddress,
      treatmentId,
      treatmentCID,
      diagnosis,
      prescription
    );
    return await tx.wait();
  }

  // Insurance functions
  async payPremium(policyId: string, amount: string) {
    const contract = await this.getContract("insurance");
    const tx = await contract.payPremium(policyId, {
      value: ethers.parseEther(amount),
    });
    return await tx.wait();
  }

  async submitClaim(
    claimId: string,
    policyId: string,
    amount: string,
    treatmentCID: string
  ) {
    const contract = await this.getContract("insurance");
    const tx = await contract.submitClaim(
      claimId,
      policyId,
      ethers.parseEther(amount),
      treatmentCID
    );
    return await tx.wait();
  }

  // Payment functions
  async processPayment(
    toAddress: string,
    amount: string,
    paymentType: string,
    referenceId: string
  ) {
    const contract = await this.getContract("payments");
    const tx = await contract.processPayment(
      toAddress,
      paymentType,
      referenceId,
      {
        value: ethers.parseEther(amount),
      }
    );
    return await tx.wait();
  }

  // Utility functions
  async getTransactionReceipt(txHash: string) {
    if (!this.provider) {
      await this.connect();
    }
    return await this.provider!.getTransactionReceipt(txHash);
  }
}

export const blockchainClient = new BlockchainClient();
