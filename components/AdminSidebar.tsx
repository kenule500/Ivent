"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut, Shield, X } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import {
  groupedNavItems,
  isNavItemActive,
  type AdminFeatureFlag,
} from "@/lib/admin-nav";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  enabledFlags?: Partial<Record<AdminFeatureFlag, boolean>>;
}

export default function AdminSidebar({
  isOpen,
  onClose,
  enabledFlags,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const groups = groupedNavItems(enabledFlags);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 w-64 bg-background border-r z-50
          flex flex-col
          transition-transform duration-300 ease-in-out motion-reduce:transition-none
          md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Admin navigation"
      >
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Ivent Management</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5">
          {groups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              {items.map((item) => {
                const isActive = isNavItemActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                      isActive
                        ? "bg-purple-500/10 text-purple-500 font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-sm"
          >
            <ArrowLeft className="w-5 h-5 shrink-0" />
            Back to Site
          </Link>

          <SignOutButton redirectUrl="/admin">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-sm">
              <LogOut className="w-5 h-5 shrink-0" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
