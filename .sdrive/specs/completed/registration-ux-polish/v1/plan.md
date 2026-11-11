# Plan: Registration UX Polish (v1)

## Architecture Summary

Client-side only. One skeleton primitive and one empty-state component are added under
`components/ui/`, then consumed by route-level `loading.tsx` / `error.tsx` files and the
existing event and ticket screens. Optimistic updates are a thin layer over the existing
Convex mutations: the client writes an optimistic entry, the server stays authoritative,
and a rejection rolls the entry back and announces the reason. **No Convex function,
validator, or authorization check changes.**

## Components

| Component | Action | Path | Requirements |
|-----------|--------|------|--------------|
| Skeleton primitive | create | `components/ui/skeleton.tsx` | FR-001, FR-008 |
| Empty state | create | `components/ui/empty-state.tsx` | FR-007 |
| Event route skeleton | create | `app/(public)/events/[slug]/loading.tsx` | FR-002 |
| Tickets route skeleton | create | `app/(main)/my-tickets/loading.tsx` | FR-002 |
| Event error boundary | create | `app/(public)/events/[slug]/error.tsx` | FR-006 |
| Tickets error boundary | create | `app/(main)/my-tickets/error.tsx` | FR-006 |
| Registration dialog pending state | modify | `app/(public)/events/[slug]/_components/register-modal.tsx` | FR-003 |
| Optimistic registration | modify | register flow in the same dialog | FR-004, NFR-004 |
| Optimistic cancellation | modify | `app/(main)/my-tickets/page.tsx` | FR-004, FR-005 |
| Empty states wired | modify | my-tickets, explore, announcements | FR-007 |

## Data Model

No persistence change. Optimistic entries live only in the Convex client cache for the
lifetime of the request; every optimistic entry is either confirmed or rolled back. No
table, index, or validator is added or altered.

## Key Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-001 | One skeleton primitive; routes compose it | Multiple shimmer implementations drift and duplicate reduced-motion handling |
| D-002 | Optimistic layer stays thin, in the mutation wrapper | A second client store needs its own reconciliation rules and is the usual source of divergence |
| D-003 | Route-level error boundaries only | Per-component boundaries hide real bugs and leave a page of error boxes |
| D-004 | CLS target 0.02, not 0.1 | A skeleton that shifts the layout is worse than none |

## Testing Strategy

- **Unit/jest-dom (Vitest):** skeleton renders hidden from AT; empty-state renders reason + action; dialog disables submit while pending; optimistic rollback removes the entry and announces.
- **Integration (React Testing Library):** error boundary renders recovery copy, retry re-mounts, and no internal message leaks.
- **Manual:** throttled network on the event page and tickets; reduced-motion OS setting.
- **Performance:** Lighthouse run for CLS on both routes; bundle delta measured against the 5 KB budget.

## Risks

| Risk | Mitigation |
|------|------------|
| Optimistic state diverges from the server | Roll back on error, reconcile on settle, single mutation wrapper |
| Skeleton differs from real layout | Same spacing tokens; CLS assertion |
| Error boundary hides a defect | Console log in development; route-level only |
