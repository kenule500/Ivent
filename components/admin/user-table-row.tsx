"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Ban,
  ShieldCheck,
  Mail,
  Calendar,
  UserX,
  UserCheck,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface UserTableRowProps {
  user: {
    _id: Id<"users">;
    name: string;
    email: string;
    image?: string;
    role?: string;
    banned?: boolean;
    freeEventsCreated: number;
    createdAt?: number;
  };
  onToggleBan: (userId: Id<"users">) => void;
  onRoleChange: (userId: Id<"users">, role: "user" | "admin" | "super_admin") => void;
  isBanning: boolean;
  isUpdatingRole: boolean;
}

export function UserTableRow({ user, onToggleBan, onRoleChange, isBanning, isUpdatingRole }: UserTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image} alt={user.name} />
            <AvatarFallback className="bg-purple-500/10 text-purple-500">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            {user.role === "super_admin" && (
              <Badge className="bg-purple-500/10 text-purple-500 mt-1">
                Super Admin
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          {user.email}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={user.role || "user"}
          onValueChange={(value) => onRoleChange(user._id, value as "user" | "admin" | "super_admin")}
          disabled={isUpdatingRole}
        >
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {user.banned ? (
          <Badge variant="destructive">
            <UserX className="w-3 h-3 mr-1" />
            Banned
          </Badge>
        ) : (
          <Badge variant="secondary">
            <UserCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium">{user.freeEventsCreated}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant={user.banned ? "outline" : "ghost"}
          size="sm"
          onClick={() => onToggleBan(user._id)}
          disabled={isBanning}
          className={user.banned ? "text-green-500 hover:text-green-700" : "text-red-500 hover:text-red-700"}
          title={user.banned ? "Unban this user" : "Ban this user"}
        >
          {user.banned ? (
            <>
              <ShieldCheck className="w-4 h-4" />
              Unban
            </>
          ) : (
            <>
              <Ban className="w-4 h-4" />
              Ban
            </>
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}