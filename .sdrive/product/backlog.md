# Product Backlog

Status: Proposed · 2026-10-18 · Source: onboarding follow-up

These are owner-approved **candidates**, not scheduled work. A candidate becomes
real only when someone runs `/sdrive:propose` for it, which creates the versioned
spec, plan, tasks, and traceability. No feature spec or workflow-state entry is
created by this file.

Statuses: `backlog` = approved candidate, not started · `needs discovery` = worth
doing but the approach or cost is not settled.

## Backlog

| ID | Feature | Milestone | Priority | Dependencies | Status |
|---|---|---|---|---|---|
| BP-001 | Lifecycle emails: registration confirmation, 24-hour reminder, post-event thank-you and feedback request | M1 — Trust and polish | P0 | Resend (installed) | backlog |
| BP-002 | Add to Calendar: ICS download plus Google and Outlook links on the ticket and confirmation | M1 — Trust and polish | P0 | BP-001 for delivery | backlog |
| BP-003 | Wallet passes: Apple Wallet and Google Wallet tickets with update/void support | M2 — Premium ticket | P1 | Stable ticket model | backlog |
| BP-004 | Door mode: live check-in dashboard plus offline-capable PWA check-in with sync | M2 — Premium ticket | P0 | Existing QR check-in | backlog |
| BP-005 | Event page polish: per-event OG images, SEO metadata, sponsor logos | M1 — Trust and polish | P1 | — | backlog |
| BP-006 | Custom domains for event and organizer pages | M2 — Premium ticket | P2 | BP-005; hosting/domain provider | needs discovery |
| BP-007 | Custom registration questions with per-question CSV columns | M3 — Organizer power | P1 | Registration schema change | backlog |
| BP-008 | Waitlist with automatic promotion when a confirmed attendee cancels | M3 — Organizer power | P1 | BP-001 for notifications | backlog |
| BP-009 | Edit, cancel, and reschedule a published event with attendee notifications | M3 — Organizer power | P1 | BP-001 | backlog |
| BP-010 | Team roles and co-organizers with per-event permissions | M3 — Organizer power | P2 | BP-009; audit trail | backlog |
| BP-011 | Post-event report: attendance, check-in rate, registration funnel, feedback, shareable/PDF | M3 — Organizer power | P1 | BP-001; existing dashboard stats | backlog |
| BP-012 | Organizer public profile and verified badge | M4 — Platform | P2 | BP-011 | backlog |
| BP-013 | Public API, scoped keys, webhooks, and Zapier-style integration | M4 — Platform | P2 | Stable event/registration model | needs discovery |
| BP-014 | Multi-currency, international locations, and i18n copy | M4 — Platform | P1 | None; closes the global-scope gap | backlog |
| BP-015 | Accessibility and performance hardening: WCAG AA, keyboard paths, Lighthouse 95+ | M0 — Prestige foundation | P0 | None | backlog |
| BP-016 | Registration UX polish: skeletons, optimistic UI, error boundaries, honest empty states | M0 — Prestige foundation | P1 | None | backlog |

## Milestones

- **M0 — Prestige foundation.** Unglamorous quality work that makes everything
  after it feel credible: BP-015, BP-016.
- **M1 — Trust and polish.** The cheapest visible jump: BP-001, BP-002, BP-005.
- **M2 — Premium ticket.** The artifacts attendees show other people: BP-003,
  BP-004, BP-006.
- **M3 — Organizer power.** The features that retain serious organizers and
  justify Pro: BP-007, BP-008, BP-009, BP-010, BP-011.
- **M4 — Platform.** Credibility and distribution: BP-012, BP-013, BP-014.

## Item notes

- **BP-001** — Highest perceived quality per unit of effort. Today Resend is wired
  only for admin invites; attendee communication is the gap. Respect attendee
  consent and keep a per-event unsubscribe path.
- **BP-002** — Small surface, disproportionate “real product” signal. ICS must
  carry the event timezone, not the attendee’s.
- **BP-003** — The most premium visible artifact. Needs pass signing, a stable
  ticket identifier, and an update path for cancellation or reschedule. Treat as
  Pro.
- **BP-004** — The door is where events fail publicly. Offline queue plus
  idempotent server check-in (already enforced) makes “venue Wi-Fi died” a
  non-event. Treat as Pro.
- **BP-005** — Low effort, high shareability. Generate OG images from event data;
  never ship a generic link preview.
- **BP-006** — High prestige, real operational cost (TLS, DNS, abuse). Validate
  demand before committing; keep it Pro.
- **BP-007** — Turns a generic RSVP into a registration system. Needs schema
  versioning, per-answer export, and a privacy note.
- **BP-008** — Protects fill rate and organizer trust. Promotion must be atomic
  with cancellation to avoid overselling.
- **BP-009** — Editing is currently impossible; only create and delete exist.
  Notify confirmed attendees on material changes and keep the slug stable.
- **BP-010** — Agencies do not run events alone. Needs per-event roles, invite
  flow, and audit entries; depends on a stable edit/ownership model.
- **BP-011** — The artifact an organizer shows a boss or sponsor. Build on the
  existing dashboard stats plus funnel data that is not captured today.
- **BP-012** — Verified organizers are a trust primitive, but verification needs
  an operator process; do not imply verification before it exists.
- **BP-013** — Signals “platform,” not “app.” Requires rate limiting, scoped
  tokens, webhook retries, and a compatibility promise; defer until the core
  model is stable.
- **BP-014** — Directly closes the gap between the global product scope and the
  Nigeria-first implementation (`NG` pickers, naira, seed cities). Unglamorous
  but credibility-critical.
- **BP-015** — Accessibility and speed are prestige signals that competitors skip.
  Audit dialogs, focus order, reduced motion, and the event page budget.
- **BP-016** — Registration is the highest-intent moment in the product; make it
  feel instant and never leave a blank screen.

## Recommended sequence

1. **M0 + M1** — BP-015, BP-016, BP-001, BP-002, BP-005.
2. **M2** — BP-004 (door mode) before BP-003 (wallet passes), because door
   reliability is the operational story.
3. **M3** — BP-009 and BP-007 first; they unlock BP-008, BP-010, BP-011.
4. **M4** — BP-014 when going international; BP-012 and BP-013 once the core loop
   is stable.

## Not added (deliberate)

- Online payments and refunds — kept out of scope in the approved overview.
- Sponsor marketplace, seating charts, live streaming, multi-tier ticketing.
- Social feed, gamification, or public attendee networking.

## Open questions

- Is Pro priced per event, per month, or per seat? Wallet passes and door mode
  are natural Pro boundaries.
- Do attendees need accounts at all, or can registration stay lighter?
- Which markets after the first? Currency and location support follow that answer.
- Does “verified organizer” require documents, references, or platform history?
