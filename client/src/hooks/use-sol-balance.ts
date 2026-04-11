import { useState, useEffect, useCallback, useRef } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SUPPORTED_NETWORKS, getDefaultNetwork } from "@/lib/blockchain";

const REFRESH_INTERVAL_MS = 30_000; // refresh every 30 seconds

export interface SolBalanceState {
  balance: number | null;
  balanceFormatted: string;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  network: string;
}

export function useSolBalance(walletAddress: string | null): SolBalanceState {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const networkKey = getDefaultNetwork();
  const networkConfig = SUPPORTED_NETWORKS[networkKey];

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(networkConfig.rpcUrl, "confirmed");
      const pubKey = new PublicKey(walletAddress);
      const lamports = await connection.getBalance(pubKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (err: any) {
      console.warn("[SOL Balance] fetch error:", err?.message ?? err);
      setError("Could not fetch balance");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, networkConfig.rpcUrl]);

  // Fetch on mount and whenever the address changes
  useEffect(() => {
    fetchBalance();

    // Set up polling
    timerRef.current = setInterval(fetchBalance, REFRESH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchBalance]);

  const balanceFormatted = balance === null
    ? "—"
    : balance < 0.001
    ? "< 0.001 SOL"
    : `${balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} SOL`;

  return {
    balance,
    balanceFormatted,
    isLoading,
    error,
    refresh: fetchBalance,
    network: networkConfig.chainName,
  };
}
