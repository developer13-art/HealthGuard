import { useWallet } from "@/contexts/WalletContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, QrCode, Building, FileCheck, Zap, Smartphone, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
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
  const { isConnected, connect, isConnecting, role, connectionError, isMobileWithoutWallet } = useWallet();
  const [, navigate] = useLocation();

  // Fallback redirect: if already connected with a role (e.g. page refresh), go to dashboard
  useEffect(() => {
    if (isConnected && role) {
      navigate(getRolePath(role));
    }
  }, [isConnected, role, navigate]);

  // If already connected don't render anything (redirect is in progress)
  if (isConnected && role) return null;

  const handleConnect = async () => {
    const result = await connect();
    if (result?.role) {
      navigate(getRolePath(result.role));
    }
  };

  const features = [
    { icon: Shield, title: "Secure Identity", description: "Blockchain-based decentralized health identity with encrypted medical records" },
    { icon: QrCode, title: "Emergency Access", description: "QR/NFC codes provide instant access to critical health info for first responders" },
    { icon: FileCheck, title: "Verified Claims", description: "Smart contract-based insurance claims with cryptographic signatures" },
    { icon: Building, title: "Multi-Stakeholder", description: "Unified platform for patients, doctors, hospitals, insurers, and emergency services" },
    { icon: Zap, title: "Fast Processing", description: "Automated claim verification and approval with real-time blockchain audit trails" },
    { icon: Heart, title: "Patient-Owned", description: "You control who accesses your medical data with granular permission management" },
  ];

  const ConnectButton = ({ size = "default" as "default" | "lg", className = "" }) => {
    if (isMobileWithoutWallet) {
      return (
        <Button size={size} onClick={handleConnect} className={`gap-2 ${className}`}>
          <Smartphone className="h-5 w-5" />
          Open in MetaMask App
          <ExternalLink className="h-4 w-4" />
        </Button>
      );
    }
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
            Connecting...
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">HealthGuardX</h1>
              <p className="text-xs text-muted-foreground">Decentralized Health Identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </header>

      {connectionError && (
        <div className="bg-destructive/10 border-b border-destructive/20">
          <div className="container mx-auto px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-destructive font-medium">{connectionError}</p>
              {connectionError.includes("install") && (
                <a
                  href="https://metamask.io/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-destructive underline hover:no-underline inline-flex items-center gap-1 mt-1"
                >
                  Download MetaMask <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-16">
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
              Blockchain-verified insurance claims. Built for African healthcare realities.
            </p>
            <div className="flex flex-col items-center gap-3">
              <ConnectButton size="lg" />
              {isMobileWithoutWallet && (
                <p className="text-sm text-muted-foreground">
                  Tapping will open the link in the MetaMask app where you can connect your wallet
                </p>
              )}
            </div>
          </div>
        </div>

        {isMobileWithoutWallet && (
          <Card className="mb-10 border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Using a Mobile Device?</CardTitle>
                  <CardDescription>Connect via the MetaMask mobile app</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Install the <a href="https://metamask.io/download" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">MetaMask app</a> from the App Store or Google Play</li>
                <li>Tap <strong>Open in MetaMask App</strong> above</li>
                <li>MetaMask will open this page in its built-in browser</li>
                <li>Approve the connection request in MetaMask</li>
              </ol>
            </CardContent>
          </Card>
        )}

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

        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            {[
              { num: 1, title: "Connect Wallet", desc: "Link your MetaMask wallet to generate your unique health ID" },
              { num: 2, title: "Complete KYC", desc: "Submit encrypted identity verification for admin approval" },
              { num: 3, title: "Upload Records", desc: "Securely store medical records with client-side encryption" },
              { num: 4, title: "Generate QR", desc: "Create emergency access codes for first responders" },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground mx-auto mb-3 font-bold">{num}</div>
                <h4 className="font-semibold mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-24 mb-16">
          <h3 className="text-3xl font-bold text-center mb-12">About HealthGuardX</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <p className="text-lg text-muted-foreground">
                HealthGuardX is a revolutionary blockchain-based healthcare identity platform designed to address the unique challenges of African healthcare systems. Our mission is to ensure that every individual has access to their medical records when and where they need them most.
              </p>
              <p className="text-lg text-muted-foreground">
                By leveraging blockchain technology, we provide tamper-proof, patient-owned health records that can be accessed instantly during emergencies while maintaining the highest standards of privacy and security.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm"><Shield className="h-5 w-5 text-primary" /><span>Bank-level Encryption</span></div>
                <div className="flex items-center gap-2 text-sm"><Heart className="h-5 w-5 text-primary" /><span>Patient-Centric Design</span></div>
                <div className="flex items-center gap-2 text-sm"><Zap className="h-5 w-5 text-primary" /><span>Instant Access</span></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-12 text-center">
              <div className="space-y-6">
                <div><div className="text-4xl font-bold text-primary mb-2">100%</div><p className="text-sm text-muted-foreground">Patient Data Ownership</p></div>
                <div><div className="text-4xl font-bold text-primary mb-2">24/7</div><p className="text-sm text-muted-foreground">Emergency Access</p></div>
                <div><div className="text-4xl font-bold text-primary mb-2">∞</div><p className="text-sm text-muted-foreground">Lifetime Record Storage</p></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-16 bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Heart className="h-5 w-5" /></div>
                <h3 className="font-bold">HealthGuardX</h3>
              </div>
              <p className="text-sm text-muted-foreground">Decentralized health identity for everyone. Secure, accessible, and patient-owned.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground"><li>For Patients</li><li>For Doctors</li><li>For Hospitals</li><li>For Insurers</li></ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground"><li>Documentation</li><li>API Reference</li><li>Security</li><li>Privacy Policy</li></ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-muted-foreground"><li>GitHub</li><li>Discord</li><li>Twitter</li><li>Contact Us</li></ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">HealthGuardX — Built on BlockDAG | Secure • Decentralized • Patient-Owned</p>
            <p className="text-sm text-muted-foreground">© 2025 HealthGuardX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
