/**
 * Skip-to-content link (AC-003, T1.2).
 *
 * The first focusable element on every page. Hidden until focused, so it never
 * changes the visual layout, and it targets the `main` landmark rendered by
 * AdminAwareLayout.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-purple-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-950 focus:outline-none"
    >
      Skip to content
    </a>
  );
}
