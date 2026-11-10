import { TicketsSkeleton } from "@/components/skeletons/tickets-skeleton";

export default function MyTicketsLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading your tickets
      </p>
      <TicketsSkeleton />
    </div>
  );
}
