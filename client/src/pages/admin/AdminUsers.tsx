import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWallet } from "@/contexts/WalletContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Ban, CheckCircle, Eye, User, Trash2, Clock } from "lucide-react";
import { useState } from "react";
import UserDetailsDialog from "@/components/UserDetailsDialog";

export default function AdminUsers() {
  const { uid } = useWallet();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [suspendDuration, setSuspendDuration] = useState("1");

  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!uid,
    refetchInterval: 3000,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/status`, { status });
    },
    onSuccess: () => {
      toast({ title: "User Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, durationDays }: { userId: string; durationDays: number | null }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/suspend`, { durationDays });
    },
    onSuccess: (_, vars) => {
      const label = vars.durationDays ? `${vars.durationDays} day(s)` : "permanently";
      toast({ title: "User Suspended", description: `User has been suspended ${label}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSuspendDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      toast({ title: "User Deleted", description: "User has been permanently removed from the system" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenSuspend = (user: any) => {
    setSuspendTarget(user);
    setSuspendDuration("1");
    setSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (!suspendTarget) return;
    const days = suspendDuration === "permanent" ? null : parseInt(suspendDuration);
    suspendMutation.mutate({ userId: suspendTarget.id, durationDays: days });
  };

  const filteredUsers = users?.filter((user: any) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const statusBadge = (user: any) => {
    if (user.status === "suspended") {
      const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
      const isPermanent = !until;
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="destructive">Suspended</Badge>
          <span className="text-xs text-muted-foreground">
            {isPermanent ? "Permanently" : `Until ${until!.toLocaleDateString()}`}
          </span>
        </div>
      );
    }
    const variants: Record<string, any> = {
      verified: { variant: "default", label: "Verified" },
      pending: { variant: "secondary", label: "Pending" },
    };
    const config = variants[user.status] || { variant: "outline", label: user.status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-purple-500/10 text-purple-500",
      doctor: "bg-blue-500/10 text-blue-500",
      hospital: "bg-green-500/10 text-green-500",
      insurance_provider: "bg-orange-500/10 text-orange-500",
      emergency_responder: "bg-red-500/10 text-red-500",
      patient: "bg-gray-500/10 text-gray-500",
    };
    return <Badge className={colors[role] || ""}>{role.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage all registered users and their access</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">
              {users?.filter((u: any) => u.status === "verified").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-5">
              {users?.filter((u: any) => u.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting KYC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {users?.filter((u: any) => u.status === "suspended").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Blocked users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Complete user directory</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePicture || undefined} alt={user.username} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-mono text-xs" data-testid={`text-user-uid-${user.id}`}>{user.uid}</TableCell>
                    <TableCell className="font-medium" data-testid={`text-user-username-${user.id}`}>{user.username}</TableCell>
                    <TableCell className="font-mono text-xs" data-testid={`text-user-wallet-${user.id}`}>
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                    </TableCell>
                    <TableCell>{roleBadge(user.role)}</TableCell>
                    <TableCell>{statusBadge(user)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setDialogOpen(true);
                          }}
                          className="gap-1"
                          data-testid={`button-view-user-${user.id}`}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>

                        {user.role !== "admin" && (
                          <>
                            {user.status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleStatusMutation.mutate({ userId: user.id, status: "verified" })}
                                disabled={toggleStatusMutation.isPending}
                                className="gap-1"
                                data-testid={`button-activate-user-${user.id}`}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Activate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenSuspend(user)}
                                className="gap-1 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                                data-testid={`button-suspend-user-${user.id}`}
                              >
                                <Clock className="h-3 w-3" />
                                Suspend
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Permanently Delete User?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove <strong>{user.username}</strong> ({user.uid}) and all their associated data from the system. This action <strong>cannot be undone</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(user.id)}
                                  >
                                    Delete Permanently
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserDetailsDialog
        userId={selectedUserId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Choose how long to suspend <strong>{suspendTarget?.username}</strong>. They will not be able to log in during this period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="suspend-duration">Suspension Duration</Label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger id="suspend-duration" data-testid="select-suspend-duration">
                  <SelectValue placeholder="Choose duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days (1 Week)</SelectItem>
                  <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                  <SelectItem value="30">30 Days (1 Month)</SelectItem>
                  <SelectItem value="90">90 Days (3 Months)</SelectItem>
                  <SelectItem value="permanent">Permanently</SelectItem>
                </SelectContent>
              </Select>
              {suspendDuration !== "permanent" && (
                <p className="text-xs text-muted-foreground">
                  User will be automatically eligible for reactivation after this period.
                </p>
              )}
              {suspendDuration === "permanent" && (
                <p className="text-xs text-destructive">
                  User will remain suspended until manually reactivated by an admin.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSuspend}
              disabled={suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
