import { State, City } from "country-state-city";

interface LocationResult {
  city: string | null;
  state: string | null;
  isValid: boolean;
}

export function parseLocationSlug(slug: string): LocationResult {
  if (!slug || typeof slug !== "string") {
    return { city: null, state: null, isValid: false };
  }

  const parts = slug.split("-");

  // Must have at least 2 parts (city-state)
  if (parts.length < 2) {
    return { city: null, state: null, isValid: false };
  }

  // Get all Nigerian states to validate against
  const nigerianStates = State.getStatesOfCountry("NG");

  // Try to find a valid state at the end of the slug.
  // We check the last 1 part (e.g., "rivers") and last 2 parts (e.g., "cross-river")
  for (let i = 1; i <= 2; i++) {
    if (parts.length > i) {
      const potentialStateParts = parts.slice(-i);
      const potentialStateSlug = potentialStateParts.join("-");
      
      // Check if this matches a real Nigerian state (case-insensitive, hyphenated)
      const matchedState = nigerianStates.find(
        (s) => s.name.toLowerCase().replace(/\s+/g, "-") === potentialStateSlug
      );

      if (matchedState) {
        // We found a valid state! Everything before it is the city.
        const cityParts = parts.slice(0, -i);
        const cityName = cityParts
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
        
        const stateName = matchedState.name; // Use the official library name

        // Validate that this city actually exists in this state
        const cities = City.getCitiesOfState("NG", matchedState.isoCode);
        const cityExists = cities.some(
          (c) => c.name.toLowerCase() === cityName.toLowerCase()
        );

        if (cityExists) {
          return { city: cityName, state: stateName, isValid: true };
        }
      }
    }
  }

  // If no valid city-state combination was found
  return { city: null, state: null, isValid: false };
}

export function createLocationSlug(city: string, state: string) {
  if (!city || !state) return "";

  const citySlug = city.toLowerCase().replace(/\s+/g, "-");
  const stateSlug = state.toLowerCase().replace(/\s+/g, "-");

  return `${citySlug}-${stateSlug}`;
}

