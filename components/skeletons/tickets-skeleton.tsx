import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tickets placeholder, shared by the route-level `loading.tsx` and the page's
 * query-loading branch (FR-002, AC-001).
 */
export function TicketsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
