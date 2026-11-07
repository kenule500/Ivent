"use client";

import { useState, useMemo } from "react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  Activity,
  Trash2,
  Ban,
  ShieldCheck,
  UserCog,
  KeyRound,
  RefreshCw,
  XCircle,
  FileText,
  LucideIcon,
} from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";
import { ExportButton } from "@/components/admin/export-button";

const ITEMS_PER_PAGE = 20;

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  "event.deleted": {
    label: "Event Deleted",
    icon: Trash2,
    color: "text-red-500 bg-red-500/10",
  },
  "user.banned": {
    label: "User Banned",
    icon: Ban,
    color: "text-red-500 bg-red-500/10",
  },
  "user.unbanned": {
    label: "User Unbanned",
    icon: ShieldCheck,
    color: "text-green-500 bg-green-500/10",
  },
  "user.role_changed": {
    label: "Role Changed",
    icon: UserCog,
    color: "text-purple-500 bg-purple-500/10",
  },
  "invite.created": {
    label: "Invite Created",
    icon: KeyRound,
    color: "text-blue-500 bg-blue-500/10",
  },
  "invite.revoked": {
    label: "Invite Revoked",
    icon: XCircle,
    color: "text-red-500 bg-red-500/10",
  },
  "invite.resent": {
    label: "Invite Resent",
    icon: RefreshCw,
    color: "text-yellow-500 bg-yellow-500/10",
  },
  "invite.deleted": {
    label: "Invite Deleted",
    icon: Trash2,
    color: "text-red-500 bg-red-500/10",
  },
  "registration.cancelled": {
    label: "Registration Cancelled",
    icon: XCircle,
    color: "text-orange-500 bg-orange-500/10",
  },
};

export default function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  const [prevFilter, setPrevFilter] = useState(actionFilter);

  // Reset to page 1 when search or filter changes
  if (search !== prevSearch || actionFilter !== prevFilter) {
    setPrevSearch(search);
    setPrevFilter(actionFilter);
    setCurrentPage(1);
  }

  const { data: logs, isLoading } = useConvexQuery(api.audit.getAuditLogs, {
    search: search || undefined,
    actionFilter: actionFilter !== "all" ? actionFilter : undefined,
  });

  const { data: stats } = useConvexQuery(api.audit.getAuditStats);

  // Pagination
  const totalItems = logs?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const paginatedLogs = useMemo(() => {
    if (!logs) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return logs.slice(start, start + ITEMS_PER_PAGE);
  }, [logs, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Complete history of admin actions across the platform."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Audit log" }]}
        actions={<ExportButton module="audit" search={search || undefined} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Total Actions
            </p>
            <p className="text-3xl font-bold mt-2">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Last 24 Hours
            </p>
            <p className="text-3xl font-bold mt-2 text-blue-500">
              {stats?.last24h ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">
              Last 7 Days
            </p>
            <p className="text-3xl font-bold mt-2 text-purple-500">
              {stats?.last7d ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by admin, email, or target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={actionFilter}
          onValueChange={(v) => setActionFilter(v || "all")}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            Showing {paginatedLogs.length} of {totalItems} actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="w-12 h-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No audit logs yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Admin actions will appear here
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const config = ACTION_CONFIG[log.action];
                    const Icon = config?.icon || FileText;

                    return (
                      <TableRow key={log._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-purple-500/10 text-purple-500 text-xs">
                                {log.actorName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {log.actorName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.actorEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${config?.color || ""}`}
                          >
                            <Icon className="w-3 h-3" />
                            {config?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {log.targetLabel}
                          </span>
                          <p className="text-xs text-muted-foreground capitalize">
                            {log.targetType}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(log.createdAt, "MMM dd, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(log.createdAt, "h:mm a")}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </CardContent>
      </Card>
    </div>
  );
}