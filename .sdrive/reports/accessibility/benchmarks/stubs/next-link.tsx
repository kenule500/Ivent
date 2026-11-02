// Minimal stand-in for `next/link` used only by the accessibility harness.
// It renders a real anchor with the same accessible name the app produces, so
// axe-core can evaluate the breadcrumb without booting the Next.js runtime.
import * as React from "react";

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children?: React.ReactNode;
};

export default function Link({ href, children, ...rest }: LinkProps) {
  return React.createElement("a", { href, ...rest }, children);
}
