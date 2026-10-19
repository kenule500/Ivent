# Onboarding Report

Scanned at: 2026-10-18T13:58:00.158Z
Project root: C:\Users\KENULE-NWINEE\Documents\vscode-projs\Gomyc0de-project\Ivent

## Project Brief
- Source: code scan (README.md)
- Title: ivent
- Tech stack: TypeScript, Clerk, Convex, Next.js, React, Resend, Zod, Tailwind CSS
- ⚠️  README looks like generator boilerplate (create-next-app, getting-started section, run-the-dev-server step, learn-more section, edit-this-page instruction)
- ⚠️  It does not describe this product, so the brief was built from the code scan
- ➡️  Ask the user whether to write a real product overview (see the Onboarding Agent)

> This brief is DERIVED from the repository, not confirmed by anyone. It is
> written to `.sdrive/product/overview.md` as a draft, and only when that file
> does not already exist. Run `/sdrive:product-plan` to replace it with an
> approved plan. If the README says nothing useful, the brief falls back to the
> code scan and will be thinner - that gap is real, not an error.

## Present
- ✅ package.json
- ✅ README.md
- ✅ app
- ✅ lib
- ✅ tsconfig.json
- ✅ .sdrive/skills
- ✅ .sdrive/specs
- ✅ .sdrive/governance
- ✅ .sdrive/workflow-state.json
- ✅ .sdrive/schemas
- ✅ .sdrive/scripts
- ✅ .sdrive/commands
- ✅ .sdrive/agents
- ✅ .sdrive/dashboard
- ✅ .sdrive/mcp

## Missing
- ❌ requirements.txt
- ❌ pyproject.toml
- ❌ go.mod
- ❌ pubspec.yaml
- ❌ Cargo.toml
- ❌ pom.xml
- ❌ build.gradle
- ❌ CONTRIBUTING.md
- ❌ src
- ❌ pages
- ❌ server
- ❌ internal
- ❌ cmd
- ❌ pkg
- ❌ api
- ❌ apps
- ❌ packages
- ❌ .github/workflows
- ❌ .gitlab-ci.yml
- ❌ tests
- ❌ __tests__
- ❌ spec
- ❌ test
- ❌ jsconfig.json
- ❌ .eslintrc
- ❌ .eslintrc.js
- ❌ .eslintrc.json
- ❌ .prettierrc
- ❌ .prettierrc.js
- ❌ .prettierrc.json
- ❌ .sdrive/constitution.md

## Deferred
(none yet)

---

## Post-scan decisions

This report is the raw scan output and is intentionally not rewritten. What was
approved, generated, deferred, and validated after the scan is recorded in
`.sdrive/onboarding/decisions.md`. In short: a baseline constitution and four
retroactive specs were written, the product overview was approved through the
onboarding interview (organizer-first, global), tests/CI/skills/formatter remain
deferred, and all three gates pass: governance validation, TypeScript, and ESLint
(0 errors, 14 warnings after the follow-up config/carousel fix).
