# Code Standards

<!-- Generated during brownfield onboarding on 2026-10-18 from repository facts. -->

## Observed Project Facts

- **Language:** TypeScript. `tsconfig.json` sets `"strict": true`, `noEmit`,
  `isolatedModules`, `jsx: "react-jsx"`, `moduleResolution: "bundler"`, and the
  path alias `@/*` → repository root.
- **Linting:** flat ESLint config in `eslint.config.mjs` extending
  `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
  The project adds `"@typescript-eslint/no-explicit-any": "error"`.
  `npm run lint` runs `eslint` (no arguments).
- **Formatting:** no Prettier configuration file is present. Existing code
  mostly uses two-space indentation and double quotes, but this is not enforced
  by a config. Treat formatting as `[to be confirmed]`.
- **Components:** PascalCase file names for React components
  (`EventCard`, `AdminGuard`), kebab-case for primitive UI files under
  `components/ui/` (shadcn convention).
- **Imports:** `@/` alias is used for cross-directory imports; `lucide-react`
  supplies icons; `sonner` supplies toasts.
- **Convex conventions:** argument validators via `convex/values`; mutations that
  change administrative state call `logAdminAction`; server functions either use
  `secureQuery`/`secureMutation` or call `requireAdmin` explicitly.
- **Error handling:** UI catches thrown errors and surfaces them with
  `toast.error`; server functions throw `Error` with user-readable messages.

## Standard Best Practices (from MCP/skills)

- No external research was performed; no `.sdrive/skills/` entries exist.

## Assumptions

- Because no formatter is configured, agents SHOULD match surrounding style
  rather than reformat whole files.
- A typecheck command is available through `npx tsc --noEmit` even though it is
  not defined as an npm script.
