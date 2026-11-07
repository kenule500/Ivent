# Ivent

An event platform: organizers publish events, attendees discover and register for
them, and a full admin console governs the platform.

Built on Next.js 16 (App Router) + React 19, Convex as the backend and data layer,
and Clerk for authentication.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy the variables below into `.env.local`. All of them are server-side except the
`NEXT_PUBLIC_*` ones, which are exposed to the browser by design.

| Variable | Purpose |
|----------|---------|
| `CONVEX_DEPLOYMENT` | Convex deployment identifier |
| `NEXT_PUBLIC_CONVEX_URL` | Convex client URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP site URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key (server only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up route |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer, validated by Convex |
| `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` | Unsplash cover-image search |
| `NEXT_PUBLIC_UNSPLASH_SECRET_KEY` | Unsplash cover-image search |
| `GEMINI_API_KEY` | Google AI |
| `CEREBRAS_API_KEY` | AI event generation (`/api/generate-event`) |
| `RESEND_API_KEY` | Transactional email |
| `RESEND_FROM_EMAIL` | From address for outbound email |
| `BROADCAST_SENDING_ENABLED` | Set to `true` to enable admin broadcasts |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (webpack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |

## Surfaces

### Public

- `/` — landing page with featured and popular events
- `/explore` — browse by category, city, and state
- `/events/[slug]` — event detail and registration
- `/feedback` — submit a bug, feature request, or abuse report

### Signed-in users

- `/create-event` — create an event, optionally seeded by AI
- `/my-events` — events you organize, with per-event dashboard and QR check-in
- `/my-tickets` — your registrations and QR codes

### Admin console (`/admin`)

Sign in at `/admin`; invited admins sign up at `/admin/signup`.

| Route | Purpose |
|-------|---------|
| `/admin/dashboard` | Command center: stats, recent audit activity |
| `/admin/analytics` | Filtered analytics workspace with charts |
| `/admin/events` | Event list, detail modal, delete |
| `/admin/registrations` | Registrations, cancellation |
| `/admin/users` | User list, ban/unban, role changes |
| `/admin/invites` | Admin invites: create, resend, revoke, delete |
| `/admin/announcements` | Broadcast email to an audience |
| `/admin/feedback` | Feedback inbox and triage |
| `/admin/reports` | Reports hub, per-event reports, CSV export |
| `/admin/health` | System health: crons, email, rate limits |
| `/admin/platform` | Platform settings, feature flags, maintenance mode |
| `/admin/audit` | Audit log of admin actions |
| `/admin/settings` | Your admin profile and notification preferences |

## Roles

- **user** — default role; can create events and register for them
- **admin** — full admin console access
- **super_admin** — additionally: assign roles, manage invites, change platform
  settings, send broadcasts

Roles are enforced in Convex (`requireAdmin` / `requireSuperAdmin`), never only in
the UI.

## Architecture

```
app/            Next.js routes: (public), (main), (auth), admin, api
components/     Shared UI; components/ui holds the design primitives
components/admin/  Admin console components
convex/         Backend: schema, queries, mutations, crons, email
hooks/          Client hooks (Convex wrappers, onboarding, platform settings)
lib/            Formatting, CSV, filters, navigation config, utilities
test/           Vitest suites, one folder per feature
proxy.ts        Clerk middleware: route protection and security headers
```

Key conventions:

- Authenticated Convex functions use `secureQuery` / `secureMutation`, or call
  `requireAdmin`, and perform their own ownership checks.
- Admin mutations that change users, events, invites, or registrations record an
  entry through `logAdminAction`.
- Convex function arguments are declared with `convex/values` validators.
- Cross-directory imports use the `@/*` alias.

## Testing

Vitest, with suites under `test/<feature>/`. Test names carry their acceptance
criterion ID (for example `AC-001: ...`).

```bash
npm test
npx vitest run test/admin-dashboard-update   # one feature
```

## Deployment

The app builds with `npm run build` and deploys to Vercel. Convex functions deploy
separately with the Convex CLI. Set the environment variables above in both places.
