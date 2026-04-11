import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWallet } from "@/contexts/WalletContext";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Shield, FileCheck, UserPlus, MessageSquare, Video,
  Stethoscope, Hospital, CreditCard, QrCode, Key, UserX,
  ClipboardList, AlertTriangle, CheckCircle, XCircle, Search,
  RefreshCw, User, FileText, Loader2, Clock
} from "lucide-react";
import { format } from "date-fns";

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string; category: string }> = {
  user_registered:             { label: "User Registered",              icon: UserPlus,      color: "bg-green-500/10 text-green-600",     category: "users" },
  user_deleted:                { label: "User Deleted",                 icon: UserX,         color: "bg-red-500/10 text-red-600",         category: "users" },
  user_info_updated:           { label: "User Info Updated",            icon: User,          color: "bg-blue-500/10 text-blue-600",       category: "users" },
  user_profile_updated:        { label: "Profile Updated",              icon: User,          color: "bg-blue-500/10 text-blue-600",       category: "users" },
  user_suspended:              { label: "User Suspended",               icon: UserX,         color: "bg-red-500/10 text-red-600",         category: "users" },
  profile_updated:             { label: "Profile Updated",              icon: User,          color: "bg-blue-500/10 text-blue-600",       category: "users" },
  profile_picture_updated:     { label: "Profile Picture Updated",      icon: User,          color: "bg-blue-500/10 text-blue-600",       category: "users" },
  provider_profile_updated:    { label: "Provider Profile Updated",     icon: User,          color: "bg-blue-500/10 text-blue-600",       category: "users" },

  kyc_submitted:               { label: "KYC Submitted",                icon: FileCheck,     color: "bg-yellow-500/10 text-yellow-600",   category: "kyc" },
  kyc_approved:                { label: "KYC Approved",                 icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "kyc" },
  kyc_rejected:                { label: "KYC Rejected",                 icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "kyc" },

  role_application_submitted:  { label: "Role Application",             icon: ClipboardList, color: "bg-purple-500/10 text-purple-600",   category: "roles" },
  role_granted:                { label: "Role Granted",                 icon: Key,           color: "bg-purple-500/10 text-purple-600",   category: "roles" },

  access_requested:            { label: "Access Requested",             icon: Shield,        color: "bg-yellow-500/10 text-yellow-600",   category: "access" },
  emergency_access_requested:  { label: "Emergency Access",             icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600",   category: "access" },
  access_granted:              { label: "Access Granted",               icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "access" },
  access_revoked:              { label: "Access Revoked",               icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "access" },
  access_rejected:             { label: "Access Rejected",              icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "access" },

  record_added:                { label: "Record Added",                 icon: FileText,      color: "bg-blue-500/10 text-blue-600",       category: "records" },

  consultation_requested:      { label: "Consultation Requested",       icon: MessageSquare, color: "bg-cyan-500/10 text-cyan-600",       category: "consultations" },
  consultation_accepted:       { label: "Consultation Accepted",        icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "consultations" },
  consultation_rejected:       { label: "Consultation Rejected",        icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "consultations" },

  doctor_treatment_created:    { label: "Treatment Log Created",        icon: Stethoscope,   color: "bg-teal-500/10 text-teal-600",       category: "treatments" },
  hospital_treatment_created:  { label: "Hospital Treatment Created",   icon: Hospital,      color: "bg-teal-500/10 text-teal-600",       category: "treatments" },

  patient_admitted:            { label: "Patient Admitted",             icon: Hospital,      color: "bg-indigo-500/10 text-indigo-600",   category: "admissions" },
  patient_discharged:          { label: "Patient Discharged",           icon: Hospital,      color: "bg-indigo-500/10 text-indigo-600",   category: "admissions" },
  hospital_notified_emergency: { label: "Emergency Notification",       icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600",   category: "admissions" },

  insurance_connection_requested:{ label: "Insurance Connect Request",  icon: CreditCard,    color: "bg-violet-500/10 text-violet-600",   category: "insurance" },
  insurance_connection_approved: { label: "Insurance Connected",        icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "insurance" },
  insurance_connection_rejected: { label: "Insurance Rejected",         icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "insurance" },
  insurance_auto_disconnected:   { label: "Insurance Disconnected",     icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "insurance" },
  insurance_payment_made:        { label: "Insurance Payment",          icon: CreditCard,    color: "bg-green-500/10 text-green-600",     category: "insurance" },

  claim_approved_by_insurance:  { label: "Claim Approved (Insurance)",  icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "claims" },
  claim_approved_by_patient:    { label: "Claim Approved (Patient)",    icon: CheckCircle,   color: "bg-green-500/10 text-green-600",     category: "claims" },
  claim_rejected_by_insurance:  { label: "Claim Rejected (Insurance)",  icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "claims" },
  claim_rejected_by_patient:    { label: "Claim Rejected (Patient)",    icon: XCircle,       color: "bg-red-500/10 text-red-600",         category: "claims" },
  claim_paid_by_insurance:      { label: "Claim Paid",                  icon: CreditCard,    color: "bg-green-500/10 text-green-600",     category: "claims" },

  qr_generated:                { label: "QR Code Generated",            icon: QrCode,        color: "bg-gray-500/10 text-gray-600",       category: "other" },
  qr_scanned:                  { label: "QR Code Scanned",              icon: QrCode,        color: "bg-gray-500/10 text-gray-600",       category: "other" },
  monthly_billing_processed:   { label: "Billing Processed",            icon: CreditCard,    color: "bg-violet-500/10 text-violet-600",   category: "other" },
  subscription_payment_made:   { label: "Subscription Payment",         icon: CreditCard,    color: "bg-violet-500/10 text-violet-600",   category: "other" },
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "users", label: "Users" },
  { value: "kyc", label: "KYC" },
  { value: "roles", label: "Roles" },
  { value: "access", label: "Access Control" },
  { value: "records", label: "Records" },
  { value: "consultations", label: "Consultations" },
  { value: "treatments", label: "Treatments" },
  { value: "admissions", label: "Admissions" },
  { value: "insurance", label: "Insurance" },
  { value: "claims", label: "Claims" },
  { value: "other", label: "Other" },
];

export default function AdminAudit() {
  const { uid } = useWallet();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: logs, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<any[]>({
    queryKey: ["/api/admin/audit-logs"],
    enabled: !!uid,
    refetchInterval: 5000,
  });

  const filtered = logs?.filter((log) => {
    const config = ACTION_CONFIG[log.action];
    const cat = config?.category || "other";
    const matchCat = category === "all" || cat === category;
    const matchSearch =
      !search ||
      (log.username && log.username.toLowerCase().includes(search.toLowerCase())) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.targetType && log.targetType.toLowerCase().includes(search.toLowerCase())) ||
      (log.userId && log.userId.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const todayLogs = logs?.filter((log) => {
    const d = new Date(log.timestamp);
    const t = new Date();
    return d.toDateString() === t.toDateString();
  }) || [];

  const accessCount = logs?.filter((l) => l.action.includes("access")).length || 0;
  const criticalCount = logs?.filter((l) =>
    ["user_deleted", "kyc_rejected", "access_revoked", "user_suspended", "claim_rejected_by_insurance"].includes(l.action)
  ).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Full system-wide activity monitoring and compliance tracking</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          <Clock className="h-3 w-3" />
          <span>Auto-refreshes every 5s</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} data-testid="button-refresh-logs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{todayLogs.length}</div>
            <p className="text-xs text-muted-foreground">Events today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{accessCount}</div>
            <p className="text-xs text-muted-foreground">Access changes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Rejections / deletions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>System Activity Log</CardTitle>
              <CardDescription>
                {filtered?.length || 0} event{(filtered?.length || 0) !== 1 ? "s" : ""} shown
                {dataUpdatedAt ? ` · Last updated ${format(new Date(dataUpdatedAt), "h:mm:ss a")}` : ""}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 sm:w-56"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="sm:w-48" data-testid="select-category">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log: any) => {
                    const config = ACTION_CONFIG[log.action];
                    const Icon = config?.icon || Activity;
                    const label = config?.label || log.action.replace(/_/g, " ");
                    const color = config?.color || "bg-gray-500/10 text-gray-600";
                    return (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <Badge className={`${color} text-xs whitespace-nowrap`}>
                              {label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.username || "System"}</span>
                            {log.userId && (
                              <span className="font-mono text-xs text-muted-foreground">{log.userId.slice(0, 8)}...</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.targetType ? (
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{log.targetType}</span>
                              {log.targetId && (
                                <span className="font-mono text-xs text-muted-foreground">{log.targetId.slice(0, 8)}...</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs">
                          {log.metadata ? (
                            <span className="truncate block" title={JSON.stringify(log.metadata)}>
                              {Object.entries(log.metadata).slice(0, 2).map(([k, v]: any) =>
                                `${k}: ${typeof v === "string" ? v.slice(0, 20) : v}`
                              ).join(" · ")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {log.timestamp ? format(new Date(log.timestamp), "MMM d, yyyy h:mm a") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search || category !== "all" ? "No events match your filters" : "No audit logs found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
