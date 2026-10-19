# Execution Tasks: AI Event Creation

> Retroactive record: every task documents work already present in the codebase
> or a gate check performed on 2026-10-18, so all tasks are marked complete.

## P1 — Server endpoint

- [x] **T1.1** Build the generate-event route and prompt validation.
  - Linked: FR-002, AC-002
  - Parse the body, reject an absent prompt with 400.
- [x] **T1.2** Call the provider and return the structured draft.
  - Linked: FR-002, AC-002
  - Constrained system prompt, JSON response format, five-field output.
- [x] **T1.3** Handle the key and provider failures.
  - Linked: FR-003, FR-004, NFR-001, AC-002, AC-003
  - Lazy client from `CEREBRAS_API_KEY`, 500 on missing key/provider/parse error.

## P2 — Client dialog

- [x] **T2.1** Build the prompt dialog.
  - Linked: FR-001, AC-001
  - Trigger, textarea, Cancel/Generate, loading state, request.
- [x] **T2.2** Fill the create-event form from the draft.
  - Linked: FR-005, AC-004
  - Map title, description, category, capacity, and ticket type; no save.
- [x] **T2.3** Surface failures.
  - Linked: FR-006, NFR-002, AC-005
  - Error toast and dialog kept open on a thrown failure.

## P3 — Verification

- [x] **T3.1** Run ESLint.
  - Linked: NFR-003
  - Result (2026-10-18): passes with 0 errors and 14 warnings after ignoring
    `.sdrive/**` and `convex/_generated/**` and deferring the carousel's initial
    select to the next frame.
- [x] **T3.2** Run TypeScript checking.
  - Linked: NFR-003
  - Result: `npx tsc --noEmit` exits 0.
- [x] **T3.3** Run SpecDrive governance validation.
  - Linked: NFR-003
  - Result: all present artifacts valid.


## P4 — Fix review findings

- [ ] **T4.1** Handle non-OK responses in AIEventCreator.
  - Linked: FR-006, NFR-002, AC-005
  - Check response.ok before parsing, show an error toast, keep the dialog open, and do not call onEventGenerated.
