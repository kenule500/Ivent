# Project Constitution

> **Version:** 1.0.0
> **Last Updated:** 2026-10-18
> **Status:** Active
>
> This baseline was generated during brownfield onboarding from repository facts.
> It records what the code already enforces or clearly intends. Items marked
> `[to be confirmed]` were not discoverable from the repository and MUST be
> settled by a human before they are treated as binding. Amend it with
> `/sdrive:constitution`; do not rewrite it silently.

This document is the single source of truth for all project standards, rules, and constraints. All AI agents and developers MUST adhere to these rules.

## 1. Tech Stack & Architecture (CON-1xx)

- **CON-101:** The application MUST remain a Next.js App Router project (Next.js 16.x) using React 19 and TypeScript 5. <!-- source: package.json; app/layout.tsx -->
- **CON-102:** Convex MUST remain the backend and data layer. Domain logic belongs in `convex/*.ts` and the schema in `convex/schema.ts`; a separate REST/GraphQL server MUST NOT be introduced without an approved spec. <!-- source: .sdrive/context/architecture-context.md; convex/schema.ts -->
- **CON-103:** Authentication MUST be provided by Clerk, and Convex MUST validate the Clerk JWT through `convex/auth.config.ts`. Server code MUST NOT trust a user id supplied by the client. <!-- source: convex/auth.config.ts; convex/helpers.ts -->
- **CON-104:** Styling MUST use Tailwind CSS v4 and the shared primitives in `components/ui/`; a second component or styling system MUST NOT be introduced for a feature. <!-- source: .sdrive/context/ui-context.md; components/ui -->
- **CON-105:** Third-party credentials (Clerk, Convex, Resend, Cerebras, Google AI) MUST be read from server-side environment variables and MUST NOT be shipped to the browser. <!-- source: app/api/generate-event/route.ts; convex/emails.ts -->

## 2. Coding Standards (CON-2xx)

- **CON-201:** TypeScript MUST compile with `strict` enabled. New code MUST NOT weaken `tsconfig.json` compiler options. <!-- source: tsconfig.json -->
- **CON-202:** `any` MUST NOT be introduced. ESLint treats `@typescript-eslint/no-explicit-any` as an error. <!-- source: eslint.config.mjs -->
- **CON-203:** Cross-directory imports SHOULD use the `@/*` alias, which resolves to the repository root. <!-- source: tsconfig.json -->
- **CON-204:** `npm run lint` MUST pass before a feature is considered complete. <!-- source: package.json; .sdrive/context/ai-workflow-rules.md -->
- **CON-205:** Authenticated Convex queries and mutations MUST use `secureQuery` / `secureMutation`, or call `requireAdmin`, and MUST perform their own ownership/role checks. <!-- source: convex/helpers.ts -->
- **CON-206:** Administrative mutations that change users, events, invites, or registrations MUST record an entry through `logAdminAction`. <!-- source: convex/audit.ts; convex/admin.ts -->
- **CON-207:** Convex function arguments MUST be declared with `convex/values` validators; unvalidated free-form objects MUST NOT be accepted. <!-- source: convex/events.ts; convex/admin.ts -->

## 3. UI/UX Standards (CON-3xx)

- **CON-301:** The product is dark-first: `defaultTheme` is `dark`, and new screens MUST remain legible in the shared dark palette. <!-- source: app/layout.tsx; .sdrive/context/ui-context.md -->
- **CON-302:** Interactive controls MUST reuse the `components/ui/` primitives (button, dialog, select, tabs, etc.) rather than raw unthemed HTML controls. <!-- source: components/ui; .sdrive/context/ui-context.md -->
- **CON-303:** Icons MUST come from `lucide-react`; category emoji are the only exception. <!-- source: components; lib/data.ts -->
- **CON-304:** Every data-driven screen MUST provide a loading state and an empty state, and MUST be usable down to a 360px-wide viewport. <!-- source: app/(public)/explore/page.tsx; .sdrive/context/ui-context.md -->
- **CON-305:** Dialogs, menus, and form controls MUST keep their accessible name and keyboard behaviour; icon-only buttons MUST carry an `aria-label`. <!-- source: .sdrive/context/ui-context.md; components/AdminGuard.tsx -->

## 4. Testing & Quality (CON-4xx)

- **CON-401:** Test framework is `[to be confirmed]` — no test framework is configured in `package.json`. <!-- source: .sdrive/context/ai-workflow-rules.md -->
- **CON-402:** Run tests with `[to be confirmed]` — no test script exists. <!-- source: package.json -->
- **CON-403:** Tests live in `[to be confirmed]` — no test folder exists. <!-- source: .sdrive/context/ai-workflow-rules.md -->
- **CON-404:** Every acceptance criterion MUST have at least one test once a test framework is adopted. <!-- source: SpecDrive -->
- **CON-405:** Test names MUST include the acceptance criterion ID (e.g. `AC-001`). <!-- source: SpecDrive -->
- **CON-406:** Test files MUST be organized by feature under the project's test folder using the framework's convention: `[TEST_FOLDER]/<feature>/<subfeature>.<test-suffix>.<ext>`. The `<feature>` segment MUST match the SpecDrive feature folder name. If the project later adopts a flat layout, ask the user before restructuring. <!-- source: SpecDrive -->

## 5. Security & Compliance (CON-5xx)

- **CON-501:** AI agents MUST NOT read, modify, or commit files containing secrets or private information. <!-- source: Universal Security Default -->
- **CON-502:** AI agents MUST treat the following file patterns as OFF-LIMITS: `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`, `config/secrets/*`, `.git/config`. <!-- source: Universal Security Default -->
- **CON-503:** AI agents MUST respect `.gitignore` patterns and treat ignored files as private and off-limits. <!-- source: Universal Security Default -->
- **CON-504:** If a task requires environment configuration, AI agents MUST create or update `.env.example` only, NEVER `.env` or `.env.local`. <!-- source: Universal Security Default -->
- **CON-505:** AI agents MUST NEVER commit actual secrets, API keys, passwords, or tokens to the repository, even in test files or comments. <!-- source: Universal Security Default -->
- **CON-506:** When a feature requires HTTP security headers, configure them with `headers()` in `next.config.ts`. Express-only middleware such as Helmet MUST NOT be added to this Next.js application. <!-- source: next.config.ts; .sdrive/context/architecture-context.md -->

### Security Baseline (CON-51x)

Every feature that touches authentication, user input, or an HTTP surface MUST address each control below. `/sdrive:propose` expands the REQUIRED controls into concrete tasks; `/sdrive:apply` builds them; `/sdrive:secure` verifies them.

| ID | Control | Status | Rationale |
|----|---------|--------|-----------|
| CON-511 | Authentication | REQUIRED | Clerk signs users in and Convex validates the Clerk JWT. |
| CON-512 | Authorization | REQUIRED | Roles (`user`, `admin`, `super_admin`) are enforced in Convex, not only in the UI. |
| CON-513 | Security Headers (Helmet) | NOT APPLICABLE | Helmet is Express-specific; this project has no Express server. Use `next.config.ts` headers when needed (CON-506). |
| CON-514 | Rate Limiting | REQUIRED | `@convex-dev/rate-limiter` already limits event creation, check-in, and invite generation. |
| CON-515 | Input Validation | REQUIRED | Forms use Zod and Convex functions declare argument validators. |
| CON-516 | NoSQL / Injection Protection | NOT APPLICABLE | Convex queries are typed and parameterized; the project assembles no query strings. |
| CON-517 | XSS Protection | REQUIRED | React escapes rendered content by default; `dangerouslySetInnerHTML` MUST NOT be introduced without review. |
| CON-518 | CSRF Protection | NOT APPLICABLE | State-changing calls are Convex mutations authenticated by a Clerk token, not cookie-driven HTML form posts. |
| CON-519 | Environment Security | REQUIRED | `.env*` is git-ignored; secrets belong in server env or the Convex dashboard. |
| CON-520 | HTTPS / HSTS | REQUIRED | Production traffic MUST be served over HTTPS; HSTS is enforced at the hosting layer. |

<!-- source: SpecDrive Security Baseline -->

## 6. Git Workflow & Process (CON-6xx)

- **CON-601:** No branch convention is documented in the repository. Agents MUST use the SpecDrive policy below: one feature branch named `feature/<feature-name>`, created from the branch it will merge into. <!-- source: .sdrive/context/ai-workflow-rules.md; SpecDrive Enterprise Branching Policy -->
- **CON-602:** No feature may be marked complete unless `sdrive verify <feature>` returns `pass` or `warn`. <!-- source: SpecDrive -->
- **CON-603:** Every feature MUST have a version folder (`v1`, `v2`, ...) before implementation begins. <!-- source: SpecDrive -->
- **CON-604:** New versions MUST only be created for structural changes (new workflow, new user story, behavior change). Minor edits stay in the current version. <!-- source: SpecDrive -->
- **CON-605:** All agents MUST operate within the feature's `currentVersion` folder only. Older versions MUST NOT be modified. <!-- source: SpecDrive -->
- **CON-606:** ONE BRANCH PER FEATURE (non-negotiable). Each feature MUST be implemented on its own dedicated branch. Two features MUST NEVER share a branch. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-607:** The feature branch MUST be named `feature/<feature-name>` using the SpecDrive feature folder name (kebab-case), e.g. `feature/admin-console-and-governance`. The resolved branch name MUST be reported to the user. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-608:** Agents MUST NEVER implement directly on the repository's default or protected branch. The default branch MUST be resolved dynamically and NEVER assumed to be `main`. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-609:** A feature branch MUST be created from an approved base branch, and the working tree MUST be clean (`git status --porcelain` empty) before any branch switch or creation. A dirty tree MUST block the operation. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-610:** The feature branch MUST be deleted after its merge is confirmed — locally and on the remote — unless the user explicitly declines. The merge target branch MUST NEVER be deleted. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-611:** A branch MUST be merged as a single review unit. `/sdrive:archive` MUST refuse to merge a branch that contains commits belonging to other in-flight features. <!-- source: SpecDrive Enterprise Branching Policy -->
- **CON-612:** A feature branch MUST be based on the branch it will eventually merge into. Dependent work MUST become a new version of the same feature, not a stacked feature. <!-- source: SpecDrive Enterprise Branching Policy -->

## 7. AI Agent Rules (CON-7xx)

- **CON-701:** Before generating specs, plans, or code, an agent MUST read this constitution and the relevant files under `.sdrive/context/`. <!-- source: SpecDrive -->
- **CON-702:** Agents MUST NOT create, edit, print, or commit `.env*` files. When configuration is needed, update `.env.example`. <!-- source: Universal Security Default -->
- **CON-703:** Agents MUST run `npm run lint` and `npx tsc --noEmit` (or the project's typecheck command once defined) after writing code, and MUST run `node .sdrive/scripts/validate-governance.js` after changing governance JSON. <!-- source: .sdrive/context/ai-workflow-rules.md -->
- **CON-704:** Agents MUST update `.sdrive/workflow-state.json` when a feature changes phase, version, or approval gate. <!-- source: SpecDrive -->
- **CON-705:** This repository's Next.js version differs from older releases. Agents MUST read the bundled guides in `node_modules/next/dist/docs/` before writing Next.js APIs. <!-- source: AGENTS.md -->
- **CON-706:** Retroactive artifacts written during onboarding MUST stay marked as retroactive in their `spec.md` frontmatter and in `workflow-state.json`; they MUST NOT be presented as approved product decisions. <!-- source: .sdrive/agents/00-onboarding.md -->

---

## Changelog

| Version | Date | Change Summary | Source |
|---------|------|----------------|--------|
| 1.0.0   | 2026-10-18 | Initial brownfield baseline generated from repository facts | onboarding scan + context files |
