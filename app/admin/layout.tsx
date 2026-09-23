"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import { Menu, Shield } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close the drawer when route changes
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  // Don't show sidebar on login or signup pages
  const isAuthPage = pathname === "/admin" || pathname === "/admin/signup";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 md:hidden flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
        </header>

        {/* Sidebar */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="md:ml-64 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}