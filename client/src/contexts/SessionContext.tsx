import React, { createContext, useContext, useState, useEffect } from "react";

interface SessionContextType {
  isConnected: boolean;
  userAddress: string | null;
  connect: (email: string, password: string) => Promise<void>;
  disconnect: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setIsConnected(true);
          setUserAddress(data.address || data.email);
          // Store role in localStorage for navigation
          if (data.role) localStorage.setItem("userRole", data.role);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    checkSession();
  }, []);

  const connect = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      setIsConnected(true);
      setUserAddress(data.address || email);
      if (data.role) localStorage.setItem("userRole", data.role);
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setIsConnected(false);
    setUserAddress(null);
    localStorage.removeItem("userRole");
  };

  return (
    <SessionContext.Provider value={{ isConnected, userAddress, connect, disconnect }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
