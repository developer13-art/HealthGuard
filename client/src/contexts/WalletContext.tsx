import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type WalletConnectionMode = "extension" | "mobile-app" | "not-available";

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
  connectionMode: WalletConnectionMode;
  isMobile: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ─── Device & Wallet Detection ────────────────────────────────────────────────

function detectMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/** Returns the Phantom provider injected by the browser extension or Phantom in-app browser */
function getPhantomProvider(): any | null {
  if (typeof window === "undefined") return null;

  // Phantom extension / Phantom in-app browser both inject window.phantom.solana
  if ((window as any).phantom?.solana?.isPhantom) {
    return (window as any).phantom.solana;
  }
  // Fallback for older Phantom versions that only inject window.solana
  if ((window as any).solana?.isPhantom) {
    return (window as any).solana;
  }
  return null;
}

/**
 * Builds a Phantom Universal Link so mobile users can open the current page
 * inside Phantom's in-app browser. Once inside that browser, window.solana
 * is injected and normal connection works.
 */
function buildPhantomDeepLink(): string {
  const pageUrl = encodeURIComponent(window.location.href);
  const origin = encodeURIComponent(window.location.origin);
  // Universal link works on both iOS and Android
  return `https://phantom.app/ul/browse/${pageUrl}?ref=${origin}`;
}

/**
 * Determine how to handle the connection:
 *   extension  → Phantom injected in the current browser (desktop ext or Phantom's own browser)
 *   mobile-app → User is on a mobile device but NOT inside Phantom's browser yet
 *   not-available → Desktop without the extension installed
 */
function detectConnectionMode(): WalletConnectionMode {
  const hasProvider = !!getPhantomProvider();
  if (hasProvider) return "extension";
  if (detectMobile()) return "mobile-app";
  return "not-available";
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<WalletConnectionMode>("extension");
  const [isMobile, setIsMobile] = useState(false);

  // ── Restore persisted session ──────────────────────────────────────────────
  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      setWalletAddress(storedAddress);
      setUid(localStorage.getItem("uid"));
      setRole(localStorage.getItem("role"));
      setStatus(localStorage.getItem("status"));
      setSuspendedUntil(localStorage.getItem("suspendedUntil"));
    }

    const mobile = detectMobile();
    setIsMobile(mobile);
    setConnectionMode(detectConnectionMode());

    // ── Account-change listener (extension / Phantom in-app browser) ──────
    const provider = getPhantomProvider();
    if (!provider) return;

    const handleAccountChanged = (publicKey: any) => {
      if (!publicKey) {
        clearSession();
      } else {
        const addr = publicKey.toString();
        setWalletAddress(addr);
        localStorage.setItem("walletAddress", addr);
      }
    };

    provider.on("accountChanged", handleAccountChanged);
    return () => provider.off("accountChanged", handleAccountChanged);
  }, []);

  // ── Helper: clear all persisted session data ───────────────────────────────
  function clearSession() {
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
  }

  // ── Helper: persist session after successful auth ─────────────────────────
  function persistSession(address: string, data: any) {
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
  }

  // ── Helper: call the auth API ──────────────────────────────────────────────
  async function authenticateWithServer(address: string) {
    const response = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: address }),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "Server error during authentication.");
    }
    return response.json();
  }

  // ── connect() ─────────────────────────────────────────────────────────────
  const connect = useCallback(async (): Promise<{
    role: string;
    uid: string;
    status: string;
  } | null> => {
    setConnectionError(null);
    const mode = detectConnectionMode();
    setConnectionMode(mode);

    // ── Case 1: Mobile browser without Phantom injected
    //    → open the current page inside Phantom's in-app browser
    if (mode === "mobile-app") {
      window.location.href = buildPhantomDeepLink();
      return null;
    }

    // ── Case 2: Desktop without the extension installed
    if (mode === "not-available") {
      setConnectionError(
        "Phantom wallet extension not found. Please install it to continue."
      );
      return null;
    }

    // ── Case 3: Extension present (desktop) or inside Phantom's browser (mobile)
    const provider = getPhantomProvider()!;

    try {
      setIsConnecting(true);

      let publicKey: any;
      try {
        const resp = await provider.connect();
        publicKey = resp.publicKey;
      } catch (err: any) {
        if (
          err.code === 4001 ||
          err.message?.toLowerCase().includes("user rejected")
        ) {
          setConnectionError(
            "Connection request was rejected. Please approve it in Phantom and try again."
          );
        } else {
          setConnectionError("Failed to connect to Phantom. Please try again.");
          console.error("Phantom connect error:", err);
        }
        return null;
      }

      const address = publicKey?.toString();
      if (!address) {
        setConnectionError("No account returned. Please unlock Phantom and try again.");
        return null;
      }

      const data = await authenticateWithServer(address);
      persistSession(address, data);
      return { role: data.role, uid: data.uid, status: data.status };
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      setConnectionError(error.message || "Unexpected error. Please try again.");
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ── disconnect() ──────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (provider) {
      try {
        await provider.disconnect();
      } catch (_) {}
    }
    clearSession();
  }, []);

  // ── refreshUserData() ─────────────────────────────────────────────────────
  const refreshUserData = useCallback(async () => {
    const addr = walletAddress || localStorage.getItem("walletAddress");
    if (!addr) return;
    try {
      const data = await authenticateWithServer(addr);
      persistSession(addr, data);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  }, [walletAddress]);

  // ── signMessage() ─────────────────────────────────────────────────────────
  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const provider = getPhantomProvider();
      if (!provider) throw new Error("Phantom wallet not available");
      const addr = walletAddress || localStorage.getItem("walletAddress");
      if (!addr) throw new Error("No wallet address found");

      const encoded = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encoded, "utf8");
      return Buffer.from(signature).toString("base64");
    },
    [walletAddress]
  );

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
        connectionMode,
        isMobile,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}

// ─── Global type augmentation ────────────────────────────────────────────────

declare global {
  interface Window {
    phantom?: { solana?: any };
    solana?: any;
  }
}
