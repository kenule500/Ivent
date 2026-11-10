import { EventSkeleton } from "@/components/skeletons/event-skeleton";

export default function EventLoading() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading event details
      </p>
      <EventSkeleton />
    </div>
  );
}
