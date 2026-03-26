import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface WalletContextType {
  walletAddress: string | null;
  uid: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  role: string | null;
  status: string | null;
  suspendedUntil: string | null;
  connect: () => Promise<{ role: string; uid: string; status: string } | null>;
  disconnect: () => void;
  refreshUserData: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  connectionError: string | null;
  isMobileWithoutWallet: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function detectMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function detectMetaMaskMobileBrowser(): boolean {
  return typeof window.ethereum !== "undefined" && !!window.ethereum?.isMetaMask;
}

function getMetaMaskDeepLink(): string {
  const currentUrl = encodeURIComponent(window.location.href);
  return `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobileWithoutWallet, setIsMobileWithoutWallet] = useState(false);

  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    const storedUid = localStorage.getItem("uid");
    const storedRole = localStorage.getItem("role");
    const storedStatus = localStorage.getItem("status");
    const storedSuspendedUntil = localStorage.getItem("suspendedUntil");

    if (storedAddress) {
      setWalletAddress(storedAddress);
      setUid(storedUid);
      setRole(storedRole);
      setStatus(storedStatus);
      setSuspendedUntil(storedSuspendedUntil);
    }

    const isMobile = detectMobile();
    const hasWallet = typeof window.ethereum !== "undefined";
    setIsMobileWithoutWallet(isMobile && !hasWallet);

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWalletAddress(null);
          setUid(null);
          setRole(null);
          setStatus(null);
          setSuspendedUntil(null);
          localStorage.removeItem("walletAddress");
          localStorage.removeItem("uid");
          localStorage.removeItem("role");
          localStorage.removeItem("status");
          localStorage.removeItem("suspendedUntil");
        } else if (accounts[0] !== walletAddress) {
          setWalletAddress(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      };
    }
  }, []);

  const connect = useCallback(async (): Promise<{ role: string; uid: string; status: string } | null> => {
    setConnectionError(null);
    const isMobile = detectMobile();
    const hasEthereum = typeof window.ethereum !== "undefined";

    // Mobile user without MetaMask browser — redirect to open dapp inside MetaMask
    if (isMobile && !hasEthereum) {
      const deepLink = getMetaMaskDeepLink();
      window.location.href = deepLink;
      return null;
    }

    // Desktop user without MetaMask extension
    if (!hasEthereum) {
      setConnectionError("MetaMask not found. Please install the MetaMask browser extension.");
      return null;
    }

    try {
      setIsConnecting(true);

      let accounts: string[];
      try {
        accounts = await window.ethereum!.request({
          method: "eth_requestAccounts",
          params: [],
        });
      } catch (requestError: any) {
        if (requestError.code === 4001) {
          setConnectionError("You rejected the connection request. Please try again and approve it in MetaMask.");
        } else if (requestError.code === -32002) {
          setConnectionError("A connection request is already pending. Please open MetaMask and approve it.");
        } else {
          setConnectionError("Failed to connect wallet. Please try again.");
          console.error("eth_requestAccounts error:", requestError);
        }
        return null;
      }

      const address = accounts?.[0];
      if (!address) {
        setConnectionError("No account returned. Please unlock MetaMask and try again.");
        return null;
      }

      const response = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setConnectionError(errData.message || "Server error during authentication. Please try again.");
        return null;
      }

      const data = await response.json();
      setWalletAddress(address);
      setUid(data.uid);
      setRole(data.role);
      setStatus(data.status);
      setSuspendedUntil(data.suspendedUntil ?? null);

      localStorage.setItem("walletAddress", address);
      localStorage.setItem("uid", data.uid);
      localStorage.setItem("role", data.role);
      localStorage.setItem("status", data.status);
      if (data.suspendedUntil) {
        localStorage.setItem("suspendedUntil", data.suspendedUntil);
      } else {
        localStorage.removeItem("suspendedUntil");
      }

      return { role: data.role, uid: data.uid, status: data.status };
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      setConnectionError("Unexpected error connecting wallet. Please try again.");
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setUid(null);
    setRole(null);
    setStatus(null);
    setSuspendedUntil(null);
    setConnectionError(null);

    localStorage.removeItem("walletAddress");
    localStorage.removeItem("uid");
    localStorage.removeItem("role");
    localStorage.removeItem("status");
    localStorage.removeItem("suspendedUntil");
  }, []);

  const refreshUserData = useCallback(async () => {
    const stored = localStorage.getItem("walletAddress");
    const addr = walletAddress || stored;
    if (!addr) return;

    try {
      const response = await fetch("/api/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr }),
      });

      if (response.ok) {
        const data = await response.json();
        setUid(data.uid);
        setRole(data.role);
        setStatus(data.status);
        setSuspendedUntil(data.suspendedUntil ?? null);

        localStorage.setItem("uid", data.uid);
        localStorage.setItem("role", data.role);
        localStorage.setItem("status", data.status);
        if (data.suspendedUntil) {
          localStorage.setItem("suspendedUntil", data.suspendedUntil);
        } else {
          localStorage.removeItem("suspendedUntil");
        }
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }, [walletAddress]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!window.ethereum) throw new Error("No wallet connected");
    const address = walletAddress || localStorage.getItem("walletAddress");
    if (!address) throw new Error("No wallet address found");

    const signature = await window.ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });
    return signature as string;
  }, [walletAddress]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        uid,
        role,
        status,
        suspendedUntil,
        isConnected: !!walletAddress,
        isConnecting,
        connect,
        disconnect,
        refreshUserData,
        signMessage,
        connectionError,
        isMobileWithoutWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
