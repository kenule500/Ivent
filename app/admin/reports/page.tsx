"use client";

import * as React from "react";
import Link from "next/link";
import { FileBarChart, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/useConvexQuery";
import { PageHeader } from "@/components/admin/page-header";
import { PanelState } from "@/components/admin/panel-state";
import { Pagination } from "@/components/admin/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const { currency } = usePlatformSettings();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const { data, isLoading } = useConvexQuery(api.reports.listEvents, {
    search: search.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Per-event attendance, check-in, capacity, and revenue in one printable view."
        breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Reports" }]}
      />

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search events by title…"
          aria-label="Search events"
          className="pl-8"
        />
      </div>

      <div className="rounded-xl border bg-card">
        <PanelState
          loading={isLoading}
          skeletonRows={6}
          empty={!isLoading && (data?.rows.length ?? 0) === 0}
          emptyTitle="No events match"
          emptyDescription="Try a different title, or clear the search."
          onRetry={() => setPage(1)}
          className="p-4"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Organizer</TableHead>
                <TableHead className="text-right">Registrations</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/reports/${row.id}`}
                      className="flex items-center gap-2 font-medium hover:text-primary"
                    >
                      <FileBarChart className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate">{row.title}</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {row.city ?? "No city"} · {row.category}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">
                    {data
                      ? formatDate(row.startDate, {
                          currency,
                          timezone: data.timezone,
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {row.organizer}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {formatNumber(row.registrationCount)} /{" "}
                      {formatNumber(row.capacity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    View
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data && data.total > PAGE_SIZE && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={data.total}
              itemsPerPage={PAGE_SIZE}
            />
          )}
        </PanelState>
      </div>
    </div>
  );
}
