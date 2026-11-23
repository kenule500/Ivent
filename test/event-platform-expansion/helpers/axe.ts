import axe from "axe-core";

/**
 * NFR-009: run axe against a rendered surface and return human-readable
 * violations. `color-contrast` is disabled because jsdom has no layout engine
 * and cannot compute rendered colours; public-page contrast is covered by the
 * Lighthouse run, and auth-gated contrast still needs a browser pass (T7.3).
 */
export async function violationsFor(target: HTMLElement) {
  const results = await axe.run(target, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
    rules: { "color-contrast": { enabled: false } },
  });

  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} [${violation.nodes
        .map(
          (node) =>
            `${node.target.join(" ")} => ${String(node.html).slice(0, 240)}`
        )
        .join(" | ")}]`
  );
}
