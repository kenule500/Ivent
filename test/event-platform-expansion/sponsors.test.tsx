// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...props} />
  ),
}));

vi.mock("@/components/locale-provider", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string, values?: Record<string, string | number>) =>
      key === "event.sponsorLink"
        ? `Sponsor: ${values?.name ?? ""}`
        : key === "event.sponsors"
          ? "Our Sponsors"
          : key,
  }),
}));

import { SponsorStrip } from "@/app/(public)/events/[slug]/_components/sponsor-strip";

const sponsors = Array.from({ length: 6 }, (_, index) => ({
  id: `sponsor-${index + 1}`,
  name: `Sponsor ${index + 1}`,
  logoUrl: `https://cdn.example.com/sponsor-${index + 1}.png`,
  websiteUrl: `https://sponsor-${index + 1}.example.com`,
}));

describe("AC-004: public sponsor strip", () => {
  test("AC-004: sponsor strip renders at most six sponsors in order with names, alt text, safe links, and no empty section", () => {
    const { container } = render(
      <SponsorStrip sponsors={sponsors} themeColor="#1e3a8a" />
    );

    expect(
      screen.getByRole("heading", { name: "Our Sponsors" })
    ).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    links.forEach((link, index) => {
      expect(link).toHaveAttribute(
        "href",
        `https://sponsor-${index + 1}.example.com`
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAccessibleName(`Sponsor: Sponsor ${index + 1}`);
    });

    sponsors.forEach((sponsor) => {
      expect(screen.getByAltText(sponsor.name)).toHaveAttribute(
        "src",
        sponsor.logoUrl
      );
    });

    const empty = render(<SponsorStrip sponsors={[]} />);
    expect(empty.container).toBeEmptyDOMElement();
    expect(container.querySelectorAll("a")).toHaveLength(6);
  });
});
