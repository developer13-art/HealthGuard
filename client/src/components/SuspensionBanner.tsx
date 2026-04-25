import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

export function SuspensionBanner() {
  const { status, suspendedUntil, refreshUserData } = useWallet();

  useEffect(() => {
    if (status !== "suspended") return;
    const interval = setInterval(refreshUserData, 30000);
    return () => clearInterval(interval);
  }, [status, refreshUserData]);

  if (status !== "suspended") return null;

  const getTimeMessage = () => {
    if (!suspendedUntil) {
      return "Your account has been permanently suspended by the administrator.";
    }
    const until = new Date(suspendedUntil);
    const now = new Date();
    if (until <= now) {
      return "Your suspension period has ended. Please refresh or reconnect to regain access.";
    }
    const diffMs = until.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays > 1) {
      return `Your account is suspended for ${diffDays} more day${diffDays === 1 ? "" : "s"} (until ${until.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}).`;
    } else if (diffHours > 1) {
      return `Your account is suspended for ${diffHours} more hour${diffHours === 1 ? "" : "s"}.`;
    } else {
      return "Your suspension is ending very soon. Please check back shortly.";
    }
  };

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/30 text-destructive"
      data-testid="banner-suspension"
    >
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-semibold text-sm">Account Suspended</p>
        <p className="text-sm opacity-90">{getTimeMessage()} Access to all features is restricted. Contact the administrator for assistance.</p>
      </div>
    </div>
  );
}
