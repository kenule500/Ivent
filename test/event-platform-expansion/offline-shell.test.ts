// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import manifest from "@/app/manifest";

describe("AC-014: offline app shell", () => {
  test("AC-014: the PWA shell precaches the door route and offline fallback instead of showing a network error", () => {
    const worker = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    const manifestData = manifest();

    expect(manifestData.start_url).toBe("/");
    expect(manifestData.display).toBe("standalone");
    expect(manifestData.icons?.map((icon) => icon.src)).toEqual(
      expect.arrayContaining(["/icons/icon-192.png", "/icons/icon-512.png"])
    );

    expect(worker).toContain('"/offline"');
    expect(worker).toContain('"/manifest.webmanifest"');
    expect(worker).toContain("isDoorRoute");
    expect(worker).toContain("request.mode === \"navigate\"");
    expect(worker).toContain('caches.match("/offline")');
    expect(worker).toContain("url.pathname.startsWith(\"/_next/static/\")");
    expect(worker).not.toContain("TODO");
  });
});
