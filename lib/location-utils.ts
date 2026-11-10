/**
 * Slug helpers that need no dataset.
 *
 * `parseLocationSlug` lives in `lib/location-slug.ts` because validating a slug
 * against real city/state names requires the `country-state-city` dataset, and
 * loading that on every public page cost megabytes (NFR-003).
 */

export function createLocationSlug(city: string, state: string) {
  if (!city || !state) return "";

  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const stateSlug = state.toLowerCase().replace(/\s+/g, "-");

  return `${citySlug}-${stateSlug}`;
}
