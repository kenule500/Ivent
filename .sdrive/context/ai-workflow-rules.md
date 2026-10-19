# AI Workflow Rules

<!-- Generated during brownfield onboarding on 2026-10-18 from repository facts. -->

## Observed Project Facts

- **Version control:** a Git repository is present (`.git/`). There is no
  `CONTRIBUTING.md`, no documented branch convention, and no PR template.
  `git status` may legitimately be dirty during work; agents MUST NOT commit or
  discard unrelated changes.
- **Ignored paths:** `.gitignore` excludes `node_modules`, `.next`, `out`,
  `build`, `coverage`, `.env*`, `*.pem`, `*.tsbuildinfo`, and `next-env.d.ts`.
  Environment files are therefore private and off-limits.
- **Scripts:** `npm run dev` (`next dev --webpack`), `npm run build`,
  `npm run start`, `npm run lint`. There is no `test`, `typecheck`, or `convex`
  script in `package.json`.
- **CI:** no `.github/workflows` and no `.gitlab-ci.yml`; nothing runs
  automatically on push.
- **Tests:** no test framework, no test folder, no `*.test.*` / `*.spec.*`
  files. Test tooling is `[to be confirmed]`.
- **SpecDrive validation:** `node .sdrive/scripts/validate-governance.js`
  validates config, workflow state, and per-feature governance JSON. In this
  repository it needs the Ajv 8-compatibility wrapper at
  `.sdrive/onboarding/validate.js` because the root `node_modules` resolves
  Ajv 6.

## Standard Best Practices (from MCP/skills)

- SpecDrive branching policy applies even though the project has not documented
  its own: one branch per feature, named `feature/<feature-name>`, never on the
  default branch.

## Assumptions

- The repository default branch is resolved dynamically with Git; it is not
  assumed to be `main`.
- Because there is no CI, verification is manual: lint, typecheck, build, and
  SpecDrive governance validation.
