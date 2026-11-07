// components/AdminAwareLayout.tsx
"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { MaintenanceGate } from "@/components/maintenance-gate";

export default function AdminAwareLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  // Authentication must stay reachable while maintenance mode is on, otherwise
  // no super admin could sign in to turn it off (FR-025).
  const isAuthRoute =
    pathname?.startsWith("/signin") || pathname?.startsWith("/signup");

  return (
    <>
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? "min-h-screen" : "relative min-h-screen container mx-auto pt-40 md:pt-32"}>
        {!isAdminRoute && (
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
          </div>
        )}
        <div className="relative z-10">
          {isAdminRoute || isAuthRoute ? (
            children
          ) : (
            <MaintenanceGate>{children}</MaintenanceGate>
          )}
        </div>
        {!isAdminRoute && <Footer />}
      </main>
    </>
  );
}
