import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BLOCKCHAIN_CONFIG, PROGRAM_IDS } from "./blockchain-config";

class SolanaBlockchainService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(BLOCKCHAIN_CONFIG.rpcUrl, "confirmed");
  }

  async getUserByAddress(walletAddress: string): Promise<any> {
    try {
      const pubKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(pubKey);
      return {
        walletAddress,
        balance: balance / LAMPORTS_PER_SOL,
        network: BLOCKCHAIN_CONFIG.chainName,
      };
    } catch (error) {
      console.error("[Blockchain] Error fetching user:", error);
      return null;
    }
  }

  async registerUser(walletAddress: string, uid: string, username: string): Promise<string> {
    try {
      console.log(`[Blockchain] User registration prepared for ${walletAddress}: ${uid}`);
      return `user_registration_${uid}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing user registration:", error);
      throw error;
    }
  }

  async submitKYC(walletAddress: string, documentCID: string): Promise<string> {
    try {
      console.log(`[Blockchain] KYC submission prepared for ${walletAddress}: ${documentCID}`);
      return `kyc_${documentCID}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing KYC submission:", error);
      throw error;
    }
  }

  async verifyKYC(walletAddress: string, adminAddress: string): Promise<string> {
    try {
      console.log(`[Blockchain] KYC verification prepared for ${walletAddress} by ${adminAddress}`);
      return `kyc_verified_${walletAddress}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing KYC verification:", error);
      throw error;
    }
  }

  async addMedicalRecord(
    patientAddress: string,
    recordId: string,
    recordCID: string,
    recordHash: string,
    recordType: string
  ): Promise<string> {
    try {
      console.log(`[Blockchain] Medical record prepared for ${patientAddress}: ${recordId}`);
      return `record_${recordId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing medical record:", error);
      throw error;
    }
  }

  async grantAccess(patientAddress: string, requesterAddress: string, expiresAt: number): Promise<string> {
    try {
      console.log(`[Blockchain] Access grant prepared from ${patientAddress} to ${requesterAddress}`);
      return `access_grant_${Date.now()}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing access grant:", error);
      throw error;
    }
  }

  async revokeAccess(patientAddress: string, requesterAddress: string): Promise<string> {
    try {
      console.log(`[Blockchain] Access revocation prepared from ${patientAddress} for ${requesterAddress}`);
      return `access_revoke_${Date.now()}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing access revocation:", error);
      throw error;
    }
  }

  async checkAccess(patientAddress: string, requesterAddress: string): Promise<boolean> {
    try {
      console.log(`[Blockchain] Checking access from ${patientAddress} to ${requesterAddress}`);
      return false;
    } catch (error) {
      console.error("[Blockchain] Error checking access:", error);
      return false;
    }
  }

  async addTreatment(
    patientAddress: string,
    doctorAddress: string,
    treatmentId: string,
    treatmentCID: string,
    diagnosis: string,
    prescription: string
  ): Promise<string> {
    try {
      console.log(`[Blockchain] Treatment prepared for ${patientAddress} by ${doctorAddress}: ${treatmentId}`);
      return `treatment_${treatmentId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing treatment:", error);
      throw error;
    }
  }

  async createPolicy(
    patientAddress: string,
    policyId: string,
    coverageAmount: bigint,
    monthlyPremium: bigint
  ): Promise<string> {
    try {
      console.log(`[Blockchain] Insurance policy prepared for ${patientAddress}: ${policyId}`);
      return `policy_${policyId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing insurance policy:", error);
      throw error;
    }
  }

  async payPremium(patientAddress: string, policyId: string, amount: bigint): Promise<string> {
    try {
      console.log(`[Blockchain] Premium payment prepared for ${policyId}: ${amount.toString()}`);
      return `premium_${policyId}_${Date.now()}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing premium payment:", error);
      throw error;
    }
  }

  async submitClaim(
    hospitalAddress: string,
    claimId: string,
    policyId: string,
    amount: bigint,
    treatmentCID: string
  ): Promise<string> {
    try {
      console.log(`[Blockchain] Insurance claim prepared: ${claimId}`);
      return `claim_${claimId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing claim submission:", error);
      throw error;
    }
  }

  async approveClaim(insuranceAddress: string, claimId: string): Promise<string> {
    try {
      console.log(`[Blockchain] Claim approval prepared for: ${claimId}`);
      return `claim_approved_${claimId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing claim approval:", error);
      throw error;
    }
  }

  async payClaim(insuranceAddress: string, claimId: string, amount: bigint): Promise<string> {
    try {
      console.log(`[Blockchain] Claim payment prepared for: ${claimId}`);
      return `claim_paid_${claimId}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing claim payment:", error);
      throw error;
    }
  }

  async processPayment(
    fromAddress: string,
    toAddress: string,
    amount: bigint,
    paymentType: string,
    referenceId: string
  ): Promise<string> {
    try {
      console.log(`[Blockchain] Payment prepared: ${paymentType} - ${referenceId}`);
      return `payment_${referenceId}_${Date.now()}`;
    } catch (error) {
      console.error("[Blockchain] Error preparing payment:", error);
      throw error;
    }
  }

  async getTransactionDetails(signature: string): Promise<any> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      return tx;
    } catch (error) {
      console.error("[Blockchain] Error fetching transaction:", error);
      return null;
    }
  }

  generateSignatureHash(): string {
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  }

  async isAvailable(): Promise<boolean> {
    try {
      const slot = await this.connection.getSlot();
      console.log(`[Blockchain] Solana connected at slot ${slot} on ${BLOCKCHAIN_CONFIG.chainName}`);
      return true;
    } catch (error) {
      console.warn("[Blockchain] Solana network not available:", error);
      return false;
    }
  }
}

export const blockchainService = new SolanaBlockchainService();
export { SolanaBlockchainService as BlockchainService };
