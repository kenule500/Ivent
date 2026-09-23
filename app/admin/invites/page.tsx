"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Copy,
  Plus,
  Loader2,
  KeyRound,
  RefreshCw,
  Ban,
  Check,
  Search,
  Trash2,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { InviteStatusBadge } from "@/components/admin/invite-status-badge";
import { RevokeInviteModal } from "@/components/admin/revoke-invite-modal";
import { DeleteInviteModal } from "@/components/admin/delete-invite-modal";

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<Id<"adminInvites"> | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<{
    id: Id<"adminInvites">;
    email: string;
  } | null>(null);
  const [inviteToDelete, setInviteToDelete] = useState<{
    id: Id<"adminInvites">;
    email: string;
  } | null>(null);
  const [resendingId, setResendingId] = useState<Id<"adminInvites"> | null>(
    null
  );

  const [now] = useState(() => Date.now());

  const { data: invites, isLoading } = useConvexQuery(api.admin.getAdminInvites);

  const { mutate: generateInvite, isLoading: generating } = useConvexMutation(
    api.admin.generateInviteCode
  );

  const { mutate: revokeInvite, isLoading: revoking } = useConvexMutation(
    api.admin.revokeInvite
  );

  const { mutate: deleteInvite, isLoading: deleting } = useConvexMutation(
    api.admin.deleteInvite
  );

  const { mutate: resendInvite } = useConvexMutation(api.admin.resendInvite);

  const sendInviteEmail = useAction(api.emails.sendInviteEmail);

  // Filter invites
  const filteredInvites = invites?.filter((invite) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesEmail = invite.email.toLowerCase().includes(searchLower);
      const matchesAcceptedBy =
        invite.acceptedByUser?.name.toLowerCase().includes(searchLower) ||
        invite.acceptedByUser?.email.toLowerCase().includes(searchLower);

      if (!matchesEmail && !matchesAcceptedBy) return false;
    }

    if (statusFilter !== "all") {
      const effectiveStatus = invite.isExpired ? "expired" : invite.status;
      if (effectiveStatus !== statusFilter) return false;
    }

    return true;
  });

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await generateInvite({ email });

      try {
        await sendInviteEmail({
          email,
          inviteCode: result.inviteCode,
          expiresAt: result.expiresAt,
        });

        toast.success("Invite sent!", {
          description: `Email delivered to ${email}`,
        });
      } catch (emailError) {
        console.error("Email failed:", emailError);
        toast.warning("Invite created but email failed", {
          description: `Share this code manually: ${result.inviteCode}`,
        });
      }

      setEmail("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate invite";
      toast.error(errorMessage);
    }
  };

  const handleCopyCode = async (code: string, id: Id<"adminInvites">) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = async (inviteId: Id<"adminInvites">) => {
    setResendingId(inviteId);
    try {
      const newCode = await resendInvite({ inviteId });

      const invite = invites?.find((i) => i._id === inviteId);
      if (invite) {
        try {
          await sendInviteEmail({
            email: invite.email,
            inviteCode: newCode,
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          toast.success("Invite resent!", {
            description: `Email sent to ${invite.email}`,
          });
        } catch (emailError) {
          toast.warning("Code regenerated but email failed", {
            description: `New code: ${newCode}`,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to resend invite";
      toast.error(errorMessage);
    } finally {
      setResendingId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!inviteToRevoke) return;

    try {
      await revokeInvite({ inviteId: inviteToRevoke.id });
      toast.success("Invite revoked");
      setInviteToRevoke(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to revoke invite";
      toast.error(errorMessage);
    }
  };

  const handleConfirmDelete = async () => {
    if (!inviteToDelete) return;

    try {
      await deleteInvite({ inviteId: inviteToDelete.id });
      toast.success("Invite deleted");
      setInviteToDelete(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete invite";
      toast.error(errorMessage);
    }
  };

  const handleCleanupExpired = async () => {
    const expired = invites?.filter(
      (i) =>
        (i.status === "expired" || i.isExpired) &&
        i.status !== "accepted"
    );
    if (!expired || expired.length === 0) {
      toast.info("No expired invites to clean up");
      return;
    }

    if (
      !confirm(
        `Delete ${expired.length} expired invite${expired.length > 1 ? "s" : ""}? This cannot be undone.`
      )
    )
      return;

    try {
      for (const inv of expired) {
        await deleteInvite({ inviteId: inv._id });
      }
      toast.success(`Deleted ${expired.length} expired invite(s)`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Cleanup failed";
      toast.error(errorMessage);
    }
  };

  const getExpiryLabel = (invite: {
    status: string;
    expiresAt: number;
    isExpired?: boolean;
  }) => {
    if (invite.status === "accepted") return "—";
    if (invite.status === "revoked") return "—";
    if (invite.isExpired) return "Expired";

    const daysLeft = differenceInDays(invite.expiresAt, now);
    if (daysLeft <= 0) return "Expires today";
    if (daysLeft === 1) return "1 day left";
    return `${daysLeft} days left`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const totalInvites = invites?.length ?? 0;
  const pendingCount =
    invites?.filter((i) => i.status === "pending" && !i.isExpired).length ?? 0;
  const acceptedCount =
    invites?.filter((i) => i.status === "accepted").length ?? 0;
  const expiredCount =
    invites?.filter(
      (i) => (i.status === "expired" || i.isExpired) && i.status !== "accepted"
    ).length ?? 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Invites</h1>
            <p className="text-muted-foreground">
              Generate and manage admin invite codes
            </p>
          </div>
          {expiredCount > 0 && (
            <Button
              variant="outline"
              onClick={handleCleanupExpired}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clean {expiredCount} Expired
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Total Invites
              </p>
              <p className="text-3xl font-bold mt-2">{totalInvites}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Pending
              </p>
              <p className="text-3xl font-bold mt-2 text-yellow-500">
                {pendingCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">
                Accepted
              </p>
              <p className="text-3xl font-bold mt-2 text-green-500">
                {acceptedCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Generate Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle>Generate New Invite</CardTitle>
            <CardDescription>
              An email will be sent to the recipient with the invite code and link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateInvite} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ivents.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={generating}
                className="mt-6 gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or admin name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value || "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invites Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Invites</CardTitle>
            <CardDescription>
              Showing {filteredInvites?.length ?? 0} of {totalInvites} invites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accepted By</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <KeyRound className="w-12 h-12 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No invites found
                          </p>
                          {search && (
                            <p className="text-sm text-muted-foreground">
                              No results for &ldquo;{search}&rdquo;
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvites?.map((invite) => (
                      <TableRow key={invite._id}>
                        <TableCell>
                          <span className="font-medium">{invite.email}</span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {invite.inviteCode}
                          </code>
                        </TableCell>
                        <TableCell>
                          <InviteStatusBadge
                            status={invite.status}
                            isExpired={invite.isExpired}
                          />
                        </TableCell>

                        <TableCell>
                          {invite.acceptedByUser ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage
                                  src={invite.acceptedByUser.image}
                                  alt={invite.acceptedByUser.name}
                                />
                                <AvatarFallback className="bg-purple-500/10 text-purple-500 text-xs">
                                  {invite.acceptedByUser.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {invite.acceptedByUser.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {invite.acceptedAt
                                    ? format(invite.acceptedAt, "MMM dd, yyyy")
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {getExpiryLabel(invite)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(invite.createdAt, "MMM dd, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(invite.status === "pending" ||
                              invite.isExpired) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyCode(invite.inviteCode, invite._id)
                                }
                                title="Copy invite code"
                              >
                                {copiedId === invite._id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {invite.status !== "accepted" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(invite._id)}
                                disabled={resendingId === invite._id}
                                title="Resend invite (generates new code)"
                              >
                                {resendingId === invite._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                            )}

                            {(invite.status === "pending" ||
                              invite.isExpired) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setInviteToRevoke({
                                    id: invite._id,
                                    email: invite.email,
                                  })
                                }
                                className="text-orange-500 hover:text-orange-700 hover:bg-orange-500/10"
                                title="Revoke invite (keeps audit trail)"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}

                            {invite.status !== "accepted" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setInviteToDelete({
                                    id: invite._id,
                                    email: invite.email,
                                  })
                                }
                                className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                title="Delete invite permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revoke Modal */}
      <RevokeInviteModal
        isOpen={!!inviteToRevoke}
        onClose={() => setInviteToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        email={inviteToRevoke?.email || ""}
        isLoading={revoking}
      />

      {/* Delete Modal */}
      <DeleteInviteModal
        isOpen={!!inviteToDelete}
        onClose={() => setInviteToDelete(null)}
        onConfirm={handleConfirmDelete}
        email={inviteToDelete?.email || ""}
        isLoading={deleting}
      />
    </>
  );
}