import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { Wallet, LogOut, Copy, Check, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDefaultNetwork, SUPPORTED_NETWORKS } from "@/lib/blockchain";

export function WalletButton() {
  const {
    walletAddress,
    uid,
    role,
    status,
    isConnected,
    isConnecting,
    connect,
    disconnect,
  } = useWallet();

  const { balance, balanceFormatted, isLoading: balanceLoading, network, refresh } =
    useSolBalance(walletAddress);

  const [copied, setCopied] = useState(false);

  const networkKey = getDefaultNetwork();
  const networkConfig = SUPPORTED_NETWORKS[networkKey];
  const explorerUrl = walletAddress
    ? `${networkConfig.blockExplorerUrl}/account/${walletAddress}`
    : null;

  const copyAddress = useCallback(async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  // ── Not connected ─────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        disabled={isConnecting}
        data-testid="button-connect-wallet"
        className="gap-2"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  // ── Connected ─────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Trigger button: green dot + address + balance */}
          <Button
            variant="outline"
            className="gap-2 h-9 px-3"
            data-testid="button-wallet-menu"
          >
            {/* Live indicator */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>

            <span className="font-mono text-sm">
              {truncateAddress(walletAddress!)}
            </span>

            {/* Inline SOL balance in the button */}
            <span className="hidden sm:flex items-center gap-1 border-l pl-2 ml-1 text-xs text-muted-foreground">
              {balanceLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="font-semibold text-foreground">{balanceFormatted}</span>
              )}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          {/* ── Header ── */}
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Phantom Wallet</span>
            <Badge variant="outline" className="text-xs font-normal">
              {network}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* ── SOL Balance card ── */}
          <div className="px-2 py-3">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                SOL Balance
              </p>
              <div className="flex items-end justify-between">
                <span
                  className="text-2xl font-bold text-foreground"
                  data-testid="text-sol-balance"
                >
                  {balanceLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : balance === null ? (
                    <span className="text-muted-foreground text-base">Unavailable</span>
                  ) : (
                    <>
                      {balance.toLocaleString(undefined, {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                      <span className="text-sm font-normal text-muted-foreground ml-1">SOL</span>
                    </>
                  )}
                </span>

                {/* Refresh balance button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => { e.preventDefault(); refresh(); }}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh balance</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* ── Wallet details ── */}
          <div className="px-2 py-1 space-y-3">
            {/* Address */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
              <div className="flex items-center gap-1">
                <p
                  className="font-mono text-xs truncate flex-1 select-all"
                  data-testid="text-wallet-address"
                >
                  {walletAddress}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Copy */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={copyAddress}
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? "Copied!" : "Copy address"}</TooltipContent>
                  </Tooltip>
                  {/* Explorer */}
                  {explorerUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          asChild
                        >
                          <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View on Solana Explorer</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            {/* UID */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Health ID</p>
              <p className="font-mono text-xs text-foreground" data-testid="text-uid">
                {uid}
              </p>
            </div>

            {/* Role + Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">Role</p>
                <Badge variant="secondary" className="text-xs" data-testid="badge-role">
                  {role?.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={status === "verified" ? "default" : "outline"}
                  className="text-xs"
                  data-testid="badge-status"
                >
                  {status}
                </Badge>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* ── Disconnect ── */}
          <DropdownMenuItem
            onClick={disconnect}
            className="text-destructive focus:text-destructive"
            data-testid="button-disconnect"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect Wallet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
