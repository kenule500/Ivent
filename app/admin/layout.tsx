"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import AdminSidebar from "@/components/AdminSidebar";
import { CommandPalette } from "@/components/admin/command-palette";
import { Menu, Search, Shield } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const paletteTriggerRef = useRef<HTMLButtonElement>(null);

  // Auto-close the drawer when route changes
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    // Return focus to the control that opened the drawer (AC-001).
    window.requestAnimationFrame(() => sidebarTriggerRef.current?.focus());
  }, []);

  const closePalette = useCallback((open: boolean) => {
    setPaletteOpen(open);
    if (!open) {
      window.requestAnimationFrame(() => paletteTriggerRef.current?.focus());
    }
  }, []);

  // Ctrl/Cmd+K opens the palette, but never steals the shortcut from a text field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isTextEntry =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (paletteOpen) {
        event.preventDefault();
        closePalette(false);
        return;
      }
      if (isTextEntry) return;

      event.preventDefault();
      setPaletteOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, closePalette]);

  // Don't show sidebar on login or signup pages
  const isAuthPage = pathname === "/admin" || pathname === "/admin/signup";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 md:hidden flex items-center gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur">
          <button
            ref={sidebarTriggerRef}
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open sidebar"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">Admin Panel</span>
          </div>
          <button
            ref={paletteTriggerRef}
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            aria-label="Open command palette"
          >
            <Search className="size-3.5" aria-hidden="true" />
            Search
          </button>
        </header>

        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Desktop palette affordance */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="fixed bottom-5 right-5 z-20 hidden items-center gap-2 rounded-full border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur hover:text-foreground md:flex"
          aria-label="Open command palette (Control or Command plus K)"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span>Search</span>
          <kbd className="rounded border px-1 py-0.5 text-[0.6rem]">⌘K</kbd>
        </button>

        {paletteOpen && <CommandPalette onOpenChange={closePalette} />}

        {/* Main content */}
        <main className="md:ml-64 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </AdminGuard>
  );
}
