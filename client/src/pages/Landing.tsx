import { useWallet } from "@/contexts/WalletContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Heart, Shield, QrCode, Building, FileCheck, Zap,
  Smartphone, AlertCircle, ExternalLink, Loader2, Download,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function getRolePath(role: string): string {
  switch (role) {
    case "doctor": return "/doctor";
    case "hospital": return "/hospital";
    case "emergency_responder": return "/emergency";
    case "insurance_provider": return "/insurance";
    case "admin": return "/admin";
    default: return "/patient";
  }
}

export default function Landing() {
  const {
    isConnected,
    connect,
    isConnecting,
    role,
    connectionError,
    connectionMode,
    isMobile,
  } = useWallet();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isConnected && role) navigate(getRolePath(role));
  }, [isConnected, role, navigate]);

  if (isConnected && role) return null;

  const handleConnect = async () => {
    const result = await connect();
    if (result?.role) navigate(getRolePath(result.role));
  };

  const features = [
    {
      icon: Shield,
      title: "Secure Identity",
      description:
        "Phantom wallet-based decentralized health identity with encrypted medical records on Solana",
    },
    {
      icon: QrCode,
      title: "Emergency Access",
      description:
        "QR codes give first responders instant, read-only access to critical health info",
    },
    {
      icon: FileCheck,
      title: "Verified Claims",
      description: "Solana-verified insurance claims with cryptographic signatures",
    },
    {
      icon: Building,
      title: "Multi-Stakeholder",
      description:
        "Unified platform for patients, doctors, hospitals, insurers and emergency services",
    },
    {
      icon: Zap,
      title: "Fast Processing",
      description: "Automated claim verification with real-time Solana blockchain audit trails",
    },
    {
      icon: Heart,
      title: "Patient-Owned",
      description: "You control who accesses your medical data with granular permission management",
    },
  ];

  // ── Connect button — adapts to desktop ext / mobile app / not installed ──
  const ConnectButton = ({
    size = "default" as "default" | "lg",
    className = "",
  }) => {
    // Mobile: Phantom not yet injected → redirect into Phantom's in-app browser
    if (connectionMode === "mobile-app") {
      return (
        <Button
          size={size}
          onClick={handleConnect}
          className={`gap-2 ${className}`}
          data-testid="button-open-phantom-app"
        >
          <Smartphone className="h-5 w-5" />
          {size === "lg" ? "Open in Phantom App" : "Open Phantom"}
          <ExternalLink className="h-4 w-4" />
        </Button>
      );
    }

    // Desktop: extension not found → show install link
    if (connectionMode === "not-available") {
      return (
        <Button
          size={size}
          variant="outline"
          className={`gap-2 ${className}`}
          asChild
        >
          <a href="https://phantom.app/download" target="_blank" rel="noopener noreferrer">
            <Download className="h-5 w-5" />
            Install Phantom
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      );
    }

    // Extension present (desktop) OR inside Phantom's mobile browser
    return (
      <Button
        size={size}
        onClick={handleConnect}
        disabled={isConnecting}
        className={`gap-2 ${className}`}
        data-testid="button-connect-landing"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            <Shield className="h-5 w-5" />
            {size === "lg" ? "Get Started — Connect Wallet" : "Connect Wallet"}
          </>
        )}
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">HealthGuardX</h1>
              <p className="text-xs text-muted-foreground">Decentralized Health Identity on Solana</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* ── Connection error banner ── */}
      {connectionError && (
        <div className="bg-destructive/10 border-b border-destructive/20">
          <div className="container mx-auto px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-destructive font-medium">{connectionError}</p>
              {connectionError.includes("install") && (
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-destructive underline hover:no-underline inline-flex items-center gap-1 mt-1"
                >
                  Download Phantom <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-16">
        {/* ── Hero ── */}
        <div className="relative text-center mb-16 overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5 opacity-50" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200')] bg-cover bg-center opacity-10" />
          <div className="relative z-10 py-20 px-4">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Lifesaving Medical Identity
              <br />
              <span className="text-primary">Universally Accessible</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Patient-owned, tamper-proof health records with instant emergency access.
              Solana-powered insurance claims. Built for African healthcare realities.
            </p>
            <ConnectButton size="lg" />
          </div>
        </div>

        {/* ── Mobile guidance card (shown only on mobile before connecting) ── */}
        {isMobile && connectionMode === "mobile-app" && (
          <Card className="mb-10 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Connect via Phantom Mobile</CardTitle>
                  <CardDescription>
                    Tap the button to open this page inside the Phantom app
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside mb-4">
                <li>
                  Install the{" "}
                  <a
                    href="https://phantom.app/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    Phantom app
                  </a>{" "}
                  (iOS or Android)
                </li>
                <li>Tap <strong>Open in Phantom App</strong> — this opens HealthGuardX inside Phantom's built-in browser</li>
                <li>Approve the connection request in Phantom</li>
                <li>You're in — your Solana address is your health identity!</li>
              </ol>
              <ConnectButton className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* ── Desktop: no extension installed ── */}
        {!isMobile && connectionMode === "not-available" && (
          <Alert className="mb-10 border-primary/30">
            <Download className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">Phantom wallet extension not detected</p>
              <p className="text-sm">
                Install the Phantom browser extension to connect your Solana wallet and access HealthGuardX.
              </p>
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline hover:no-underline"
              >
                Download Phantom for Chrome / Firefox / Edge / Brave
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {/* ── Feature Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="hover-elevate">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* ── How It Works ── */}
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {[
              {
                num: 1,
                title: "Connect Phantom",
                desc: isMobile
                  ? "Open this page inside the Phantom app on iOS or Android"
                  : "Install the Phantom extension and click Connect Wallet",
              },
              { num: 2, title: "Complete KYC", desc: "Submit encrypted identity verification for admin approval" },
              { num: 3, title: "Upload Records", desc: "Securely store medical records with client-side encryption on IPFS" },
              { num: 4, title: "Generate QR", desc: "Create emergency access codes for first responders" },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mx-auto mb-3 font-bold">
                  {num}
                </div>
                <h4 className="font-semibold mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── About ── */}
        <div className="mt-24 mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">About HealthGuardX</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                HealthGuardX is a revolutionary blockchain-based healthcare identity platform built on
                Solana. Our mission is to ensure that every individual has access to their medical
                records when and where they need them most.
              </p>
              <p className="text-lg text-muted-foreground">
                By leveraging Solana's high-speed, low-cost blockchain and Phantom wallet for secure
                authentication, we provide tamper-proof, patient-owned health records with the highest
                standards of privacy and security.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-5 w-5 text-primary" /><span>Bank-level Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="h-5 w-5 text-primary" /><span>Patient-Centric Design</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-5 w-5 text-primary" /><span>Instant Access</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-12 text-center">
              <div className="space-y-6">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">100%</div>
                  <p className="text-sm text-muted-foreground">Patient Data Ownership</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                  <p className="text-sm text-muted-foreground">Emergency Access</p>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">∞</div>
                  <p className="text-sm text-muted-foreground">Lifetime Record Storage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t mt-16 bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Heart className="h-5 w-5" />
                </div>
                <h3 className="font-bold">HealthGuardX</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Decentralized health identity for everyone. Secure, accessible, and patient-owned.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>For Patients</li><li>For Doctors</li>
                <li>For Hospitals</li><li>For Insurers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li><li>API Reference</li>
                <li>Security</li><li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>GitHub</li><li>Discord</li>
                <li>Twitter</li><li>Contact Us</li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              HealthGuardX — Built on Solana | Secure • Decentralized • Patient-Owned
            </p>
            <p className="text-sm text-muted-foreground">© 2025 HealthGuardX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
