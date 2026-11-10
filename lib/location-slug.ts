/**
 * Location-slug parsing for public pages.
 *
 * This deliberately does NOT import `country-state-city`. That package ships a
 * worldwide city dataset (megabytes) and was being pulled into every public
 * page through this parser, which alone accounted for a large share of the
 * first-load JavaScript (NFR-003). Nigeria's states are a fixed list, so the
 * parser validates against that instead.
 *
 * The trade-off is explicit: a state is validated, a city is not. An unknown
 * city slug now resolves to a valid state with no events rather than a 404 —
 * the page already renders an honest empty state for that.
 */

/** Nigeria's 36 states plus the Federal Capital Territory. */
const NG_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Federal Capital Territory",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

interface LocationResult {
  city: string | null;
  state: string | null;
  isValid: boolean;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function parseLocationSlug(slug: string): LocationResult {
  if (!slug || typeof slug !== "string") {
    return { city: null, state: null, isValid: false };
  }

  const parts = slug.split("-").filter(Boolean);

  // Must have at least 2 parts (city-state).
  if (parts.length < 2) {
    return { city: null, state: null, isValid: false };
  }

  // Try the last two parts first ("cross-river"), then the last one ("rivers").
  for (const length of [2, 1]) {
    if (parts.length <= length) continue;

    const stateSlug = parts.slice(-length).join("-");
    const matchedState = NG_STATES.find((state) => slugify(state) === stateSlug);

    if (!matchedState) continue;

    const cityName = parts
      .slice(0, -length)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return { city: cityName, state: matchedState, isValid: true };
  }

  return { city: null, state: null, isValid: false };
}
