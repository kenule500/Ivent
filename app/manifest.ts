import type { MetadataRoute } from "next";

/**
 * PWA manifest for the offline shell (BP-005).
 *
 * Next serves this route at `/manifest.webmanifest`, which is also the path
 * cached by `public/sw.js`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ivent",
    short_name: "Ivent",
    description: "Discover events, register, and check attendees in.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f1a",
    theme_color: "#1e3a8a",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
