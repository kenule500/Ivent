// app/ConvexClientProvider.tsx
"use client";

import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from "@clerk/nextjs";
import { useStoreUser } from "@/hooks/useStoreUser";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <StoreUserSync />
      {children}
    </ConvexProviderWithClerk>
  );
}

function StoreUserSync() {
  useStoreUser();
  return null;
}