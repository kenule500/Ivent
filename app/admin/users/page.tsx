"use client";

import { useState } from "react";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { StatCard, UsersTable } from "@/components/admin";
import { PageHeader } from "@/components/admin/page-header";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  
  const { data: users } = useConvexQuery(api.admin.getAllUsers, {
    search: search || undefined,
    limit: 100,
  });

  const totalUsers = users?.length ?? 0;
  const adminCount = users?.filter((u) => u.role === "admin" || u.role === "super_admin").length ?? 0;
  const bannedCount = users?.filter((u) => u.banned).length ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        description="Manage all platform users and their permissions."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          color="text-blue-500"
          description="All registered users"
        />
        <StatCard
          label="Admins"
          value={adminCount}
          icon={ShieldCheck}
          color="text-purple-500"
          description="Users with admin access"
        />
        <StatCard
          label="Banned"
          value={bannedCount}
          icon={Ban}
          color="text-red-500"
          description="Users with restricted access"
        />
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Users Table */}
      <UsersTable />
    </div>
  );
}