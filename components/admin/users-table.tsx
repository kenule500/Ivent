"use client";

import { useState, useMemo } from "react";
import { useConvexQuery, useConvexMutation } from "@/hooks/useConvexQuery";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
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
import { Users, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { UserTableRow } from "./user-table-row";
import { Pagination } from "./pagination";

const ITEMS_PER_PAGE = 10;

interface UsersTableProps {
  search?: string;
}

export function UsersTable({ search = "" }: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [prevSearch, setPrevSearch] = useState(search);
  
  // Reset page during render if search changed (React's recommended pattern)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setCurrentPage(1);
  }
  
  const { data: users, isLoading } = useConvexQuery(api.admin.getAllUsers, {
    search: search || undefined,
    limit: 100,
  });

  const { mutate: toggleBan, isLoading: banning } = useConvexMutation(
    api.admin.toggleUserBan
  );
  
  const { mutate: updateRole, isLoading: updatingRole } = useConvexMutation(
    api.admin.updateUserRole
  );

  const handleToggleBan = async (userId: Id<"users">) => {
    try {
      await toggleBan({ userId });
      toast.success("User status updated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      toast.error(errorMessage);
    }
  };

  const handleRoleChange = async (userId: Id<"users">, role: "user" | "admin" | "super_admin") => {
    try {
      await updateRole({ userId, role });
      toast.success(`User role updated to ${role}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update role";
      toast.error(errorMessage);
    }
  };

  // Pagination
  const totalItems = users?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const paginatedUsers = useMemo(() => {
    if (!users) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return users.slice(start, end);
  }, [users, currentPage]);

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
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>
          Showing {totalItems} user{totalItems !== 1 ? "s" : ""}
          {search && ` for "${search}"`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Events Created</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No users found</p>
                      {search && (
                        <p className="text-sm text-muted-foreground">
                          No results for &rdquo;{search}&rdquo;
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers?.map((user) => (
                  <UserTableRow
                    key={user._id}
                    user={user}
                    onToggleBan={handleToggleBan}
                    onRoleChange={handleRoleChange}
                    isBanning={banning}
                    isUpdatingRole={updatingRole}
                  />
                ))
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
  );
}