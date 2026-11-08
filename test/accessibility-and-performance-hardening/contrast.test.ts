import { describe, expect, test } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * AC-006: the theme tokens must meet the WCAG 2.1 AA contrast floors.
 *
 * This reads the real `globals.css` rather than duplicating colour constants, so
 * a token edit that drops below 4.5:1 fails here instead of being discovered by
 * a user. The conversion is OKLCH -> sRGB -> relative luminance, the same maths
 * WCAG defines.
 */

function oklchToRgb(L: number, C: number, hueDegrees: number): [number, number, number] {
  const h = (hueDegrees * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const encode = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return [encode(r), encode(g), encode(bb)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) =>
    value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const a = luminance(fg);
  const b = luminance(bg);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);

  return (lighter + 0.05) / (darker + 0.05);
}

const css = fs.readFileSync(
  path.join(process.cwd(), "app", "globals.css"),
  "utf8"
);

/** First `--token: oklch(L C H)` occurrence, in file order (light theme, then dark). */
function tokens(name: string): number[] {
  const pattern = new RegExp(`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)`, "g");

  return [...css.matchAll(pattern)].map((match) => ({
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  })).map(({ l }) => l);
}

describe("AC-006: theme tokens meet WCAG AA contrast", () => {
  test("AC-006: body text on the surface background meets 4.5:1 in both themes", () => {
    const backgrounds = tokens("background");
    const foregrounds = tokens("foreground");
    const muted = tokens("muted-foreground");

    expect(backgrounds.length).toBeGreaterThanOrEqual(2);
    expect(foregrounds.length).toBeGreaterThanOrEqual(2);
    expect(muted.length).toBeGreaterThanOrEqual(2);

    const pairs = [
      ["primary text (light)", foregrounds[0], backgrounds[0]],
      ["primary text (dark)", foregrounds[1], backgrounds[1]],
      ["muted text (light)", muted[0], backgrounds[0]],
      ["muted text (dark)", muted[1], backgrounds[1]],
    ] as const;

    for (const [label, fgL, bgL] of pairs) {
      const ratio = contrast(
        oklchToRgb(fgL, 0, 0),
        oklchToRgb(bgL, 0, 0)
      );

      expect(ratio, `${label} contrast is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
