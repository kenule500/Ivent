/**
 * Focus helpers shared by dialogs and forms (AC-002, AC-004, T1.4).
 *
 * These exist so the two hard cases have one implementation: remembering the
 * element that opened a dialog and putting focus back when it closes, and
 * moving focus to the first invalid field after a failed submit.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

export function rememberFocus(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

/**
 * Return focus to the remembered trigger, or to `main` when the trigger is no
 * longer in the document (EC-001).
 */
export function restoreFocus(target: HTMLElement | null): void {
  if (typeof document === "undefined") return;

  const fallback =
    document.getElementById("main") ?? document.body ?? null;

  const element =
    target && document.contains(target) ? target : fallback;

  element?.focus({ preventScroll: true });
}

/**
 * Move focus to the first invalid control inside `container` and scroll it into
 * view. Returns false when the form has no invalid field.
 */
export function focusFirstInvalid(container: HTMLElement | null): boolean {
  if (!container) return false;

  const invalid = container.querySelector<HTMLElement>(
    '[aria-invalid="true"], [data-invalid="true"]'
  );

  if (!invalid) return false;

  invalid.focus({ preventScroll: true });
  invalid.scrollIntoView({
    block: "center",
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });

  return true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
