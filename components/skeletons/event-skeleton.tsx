import { Skeleton } from "@/components/ui/skeleton";

/**
 * Event page placeholder, shared by the route-level `loading.tsx` and by the
 * page's own query-loading branch, so both states look identical (FR-002,
 * AC-001). The layout mirrors the real page closely enough that the swap does
 * not move anything (AC-007).
 */
export function EventSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <Skeleton className="h-56 w-full rounded-xl sm:h-72" />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>

        <aside className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-4 w-2/3" />
        </aside>
      </div>
    </div>
  );
}
