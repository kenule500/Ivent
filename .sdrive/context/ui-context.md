# UI Context

<!-- Generated during brownfield onboarding on 2026-10-18 from repository facts. -->

## Observed Project Facts

- **Styling:** Tailwind CSS v4 through `@tailwindcss/postcss`; theme tokens and
  global styles in `app/globals.css`.
- **Component library:** shadcn-style primitives under `components/ui/` built on
  Base UI (`@base-ui/react`) and Radix (`@radix-ui/react-slot`), with
  `class-variance-authority`, `clsx`, and `tailwind-merge` (`cn` helper).
- **Theme:** `next-themes` with `defaultTheme "dark"`, `enableSystem`, and a
  `bg-linear-to-br from-gray-950 via-zinc-900 to-stone-900 text-white` body.
  Purple/blue/orange gradients are the dominant accent language.
- **Icons:** `lucide-react` throughout; emoji category icons from `lib/data.ts`.
- **Feedback:** `sonner` toaster mounted once in the root layout; loading states
  use `Loader2` spinners; empty states use cards with a CTA.
- **Layout:** responsive Tailwind grids (`grid-cols-1/2/3/4`, `md:`/`lg:`
  breakpoints), a sticky public header, and an admin sidebar that becomes a
  mobile drawer below `md`.
- **Accessibility:** Base UI/Radix primitives provide focus management and ARIA
  wiring for dialogs, tabs, selects, and popovers. Icon-only buttons sometimes
  include `aria-label` (e.g. the admin mobile menu); coverage is inconsistent.
- **Figma:** no Figma link or exported design tokens were found in the
  repository. No Figma design data is available.

## Standard Best Practices (from MCP/skills)

- No external research was performed. Rules below come from the repository.

## Assumptions

- The dark theme is intentional and the primary experience; light mode exists
  through `next-themes` but is not designed first.
- Accessibility coverage is partial and should be verified per feature.
