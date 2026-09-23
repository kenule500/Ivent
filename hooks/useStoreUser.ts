// hooks/useStoreUser.ts
"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export function useStoreUser() {
  const { isSignedIn, user } = useUser();
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const storeUser = useMutation(api.users.store);
  
  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    
    async function createUser() {
      try {
        const id = await storeUser();
        setUserId(id);
      } catch (error) {
        console.error("Failed to store user:", error);
      }
    }
    createUser();
    return () => setUserId(null);
  }, [isSignedIn, storeUser, user?.id]);
  
  return {
    isLoading: isSignedIn && userId === null,
    isAuthenticated: isSignedIn && userId !== null,
  };
}