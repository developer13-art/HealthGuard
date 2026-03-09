import { useSession } from "@/contexts/SessionContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Shield, QrCode, Building, FileCheck, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
export default function Landing() {
    const { isConnected, connect } = useSession();
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const role = localStorage.getItem("userRole") || "patient";
    useEffect(() => {
        if (isConnected && role) {
            setTimeout(() => {
                switch (role) {
                    case "doctor":
                        setLocation("/doctor");
                        break;
                    case "hospital":
                        setLocation("/hospital");
                        break;
                    case "emergency_responder":
                        setLocation("/emergency");
                        break;
                    case "insurance_provider":
                        setLocation("/insurance");
                        break;
                    case "admin":
                        setLocation("/admin");
                        break;
                    default:
                        setLocation("/patient");
                }
            }, 500);
        }
    }, [isConnected, role, setLocation]);
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            await connect(email, password);
        }
        catch (err) {
            setError(err.message || "Login failed");
        }
        finally {
            setIsLoading(false);
        }
    };
    const features = [
        {
            icon: Shield,
            title: "Secure Identity",
            description: "Patient-owned health identity with encrypted records",
        },
        {
            icon: QrCode,
            title: "Emergency Access",
            description: "QR codes provide instant access to critical health info",
        },
        {
            icon: FileCheck,
            title: "Verified Records",
            description: "All records are cryptographically verified",
        },
        {
            icon: Building,
            title: "Multi-Stakeholder",
            description: "Platform for patients, doctors, hospitals, insurers",
        },
        {
            icon: Zap,
            title: "Fast Processing",
            description: "Automated claim verification and approval",
        },
        {
            icon: Heart,
            title: "Patient-Owned",
            description: "You control who accesses your medical data",
        },
    ];
    if (isConnected) {
        return null;
    }
    return (<div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Heart className="h-6 w-6"/>
            </div>
            <div>
              <h1 className="text-xl font-bold">HealthGuardX</h1>
              <p className="text-xs text-muted-foreground">Health Identity Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Login to HealthGuardX</CardTitle>
              <CardDescription>Enter your email and password to access your health records</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2 border border-input rounded-md bg-background" required/>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 border border-input rounded-md bg-background" required/>
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Demo credentials: any email + any password
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-4">About HealthGuardX</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            A decentralized health identity platform for managing medical records with instant emergency access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (<Card key={index}>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6"/>
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>))}
          </div>
        </div>
      </main>
    </div>);
}
