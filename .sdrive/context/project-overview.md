# Project Overview

<!-- Generated during brownfield onboarding on 2026-10-18 from repository facts.
     Updated after the product interview; the approved plan is in
     .sdrive/product/overview.md. -->

## Observed Project Facts

- **Product name:** Ivent (`package.json` name: `ivent`, version `0.1.0`, private).
- **What the code does:** an event discovery and management platform. Organizers
  create and manage events; attendees browse, search, register, and hold QR-code
  tickets; administrators operate a back office.
- **Primary stack:** Next.js 16.2.9 (App Router) + React 19.2.4 + TypeScript 5,
  Convex 1.41 as the backend/database, Clerk 7 for authentication and billing,
  Tailwind CSS v4 + Base UI/shadcn-style primitives, Resend for email,
  Zod for form validation, Recharts for analytics charts.
- **Implementation focus:** Nigeria-first. `country-state-city` is used with country
  code `NG`, seeded events are in Lagos/Abuja/Port Harcourt, prices are displayed in
  naira (₦), and attendee onboarding defaults the country to Nigeria. The approved
  product scope is global, so this is an implementation gap, not the product
  boundary.
- **Monetization:** a Clerk billing plan named `pro` gates unlimited events and
  custom theme colors; free accounts are limited to one created event.
- **README quality:** `README.md` is untouched `create-next-app` boilerplate
  (scan quality: `template`). It says nothing about this product; the approved
  product vision lives in `.sdrive/product/overview.md`.

## Confirmed Product Direction (2026-10-18 interview)

- **Organizer-first:** the organizer workflow (publish → fill → check in) is the
  product; attendee discovery is a distribution channel.
- **Global market:** Nigeria is not the only target.
- **Users:** organizers are primary (solo, community, school, professional/
  agency); attendees are secondary; admins are internal operations.
- **Non-goals for now:** online payments, native apps, sponsor marketplace,
  seating charts, live streaming, multi-tier ticketing, complex team roles in v1.
- **Success measures:** time to first published event, fill rate, check-in rate /
  door throughput, repeat organizer rate over 90 days.
- Source: `.sdrive/product/overview.md` (`Status: Approved`, 2026-10-18).

## Standard Best Practices (from MCP/skills)

- No external research was performed during onboarding. No project-specific
  skills exist under `.sdrive/skills/`.
- `AGENTS.md` warns that this Next.js version differs from older releases and
  that `node_modules/next/dist/docs/` must be read before writing Next.js code.

## Assumptions

- The marketing counters on the home page (10K+ events, 50K+ users, etc.) are
  placeholders, not measured facts.
- The product direction is confirmed by the owner as of 2026-10-18; the
  implementation details below it are still inferred from routes, Convex
  functions, and the data model.
- The product is web-only. No mobile client is present in the repository.
