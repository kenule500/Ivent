---
title: AI Event Creation
status: completed
version: v1
created: 2026-10-18
updated: 2026-10-18
retroactive: true
---

# AI Event Creation

> **Retroactive document.** Written after the fact from the existing
> implementation. It records current behaviour, not a new product decision.

## Overview

- **Problem Statement**: An organizer with only a rough idea has to fill in a
  long create-event form, which is slow and often produces thin descriptions.
- **Proposed Solution**: A "Generate with AI" dialog in the create-event page
  sends a free-text prompt to a Next.js route handler that calls the Cerebras SDK
  and returns a structured draft (title, description, category, suggested
  capacity, suggested ticket type), which fills the form for the organizer to
  edit before saving.
- **Target Audience**: Event organizers on the create-event page.
- **Assumptions**:
  - The AI output is a draft only; nothing is persisted until the organizer
    submits the normal create-event form.
  - The Cerebras key lives in the server environment as `CEREBRAS_API_KEY`.
  - `@google/generative-ai` is installed in the project but is not used by this flow.
- **Out of Scope**:
  - Generating images, prices, venues, or dates.
  - Conversation or multi-turn refinement.
  - Saving a draft server-side.

## User Stories

### US-001: Generate event details from a prompt
As an organizer, I want to describe my idea and get a filled draft, so that I can start from something concrete.

**Acceptance Criteria:**
- AC-001: Given the dialog is open, when I submit a non-empty prompt, then a loading state shows, the request goes to `POST /api/generate-event`, and the returned title, description, category, suggested capacity, and suggested ticket type fill the form.

### US-002: Rely on a stable server contract
As the client, I want a defined request/response shape, so that the form can map the result deterministically.

**Acceptance Criteria:**
- AC-002: Given a request body without a prompt, then the endpoint responds with status 400 and an error message; given a valid prompt, then it responds with JSON containing `title`, `description`, `category`, `suggestedCapacity`, and `suggestedTicketType`.

### US-003: Keep the provider key server-side
As the operator, I want the provider key kept on the server, so that it cannot be scraped from the browser.

**Acceptance Criteria:**
- AC-003: Given the route runs, then it reads `CEREBRAS_API_KEY` from the server environment, and no provider key is present in client bundles or responses; a missing key produces a clear server error.

### US-004: Review before saving
As an organizer, I want to edit the generated draft, so that the AI cannot publish an inaccurate event on its own.

**Acceptance Criteria:**
- AC-004: Given generated values, then they only populate form fields and the event is created only when I submit the validated form, with all fields still editable.

### US-005: Fail safely
As an organizer, I want a failed generation to be visible, so that I am not left with a silently broken form.

**Acceptance Criteria:**
- AC-005: Given a network or JSON parsing failure, then an error toast is shown, the dialog stays open, and the form is not populated.

## Requirements

### Functional Requirements
- FR-001: The create-event page MUST offer a prompt dialog that requests generated event data. (AC-001)
- FR-002: `POST /api/generate-event` MUST reject a missing prompt with 400 and MUST return the five-field JSON draft for a valid prompt. (AC-002)
- FR-003: The endpoint MUST return a 500 with an error message when the provider call or JSON parsing fails. (AC-002)
- FR-004: The provider key MUST be read from the server environment only. (AC-003)
- FR-005: Generated values MUST fill the form without persisting an event. (AC-004)
- FR-006: The client MUST surface a request failure with a toast. (AC-005)

### Non-Functional Requirements
- NFR-001: Provider credentials MUST NOT be exposed to the browser. (AC-003)
- NFR-002: AI generation MUST remain optional; a failure MUST NOT prevent manual event creation. (AC-005)
- NFR-003: The feature MUST pass ESLint, TypeScript checking, and SpecDrive governance validation. (AC-002)

## UI/UX & Data Requirements

- **UI/UX**: A dialog opened from the create-event header, a six-row textarea, Cancel/Generate actions, a spinner and "Generating..." label, and sonner toasts for success and failure.
- **Data**: No new tables. The request is `{ prompt: string }`; the response is a draft object. The form maps `suggestedCapacity` → `capacity` and `suggestedTicketType` → `ticketType`.

## Edge Cases & Error States

- EC-001: Empty prompt → the client disables Generate and the server returns 400.
- EC-002: `CEREBRAS_API_KEY` is missing → the client is created lazily and throws a clear server error, returned as 500.
- EC-003: Provider error or empty completion → 500 with the provider message.
- EC-004: Model returns non-JSON → `JSON.parse` fails and the route returns 500.
- EC-005: Model returns an unknown category → the value is written into the form as-is; the form's category select may not match it.
- EC-006: The endpoint returns a non-2xx JSON error → the client currently treats it as generated data because `response.ok` is not checked.
- EC-007: The organizer closes the dialog → no request is made.

## Dependencies & Risks

- `@cerebras/cerebras_cloud_sdk`, Next.js route handlers, react-hook-form (form filling), sonner (toasts), Tailwind.
- RISK-001: The route has no authentication or rate limiting, so it is publicly callable and can be used to spend provider credits.
- RISK-002: The model output is not validated against a schema before it is returned or applied.
- RISK-003: The client ignores the HTTP status, so error bodies can be applied as if they were drafts.
- RISK-004: Hard-coded model name and provider behaviour can change without notice.

## Verification Status (2026-10-18)

- SpecDrive governance validation: **passes** for spec, plan, tasks, and traceability.
- `npx tsc --noEmit`: **passes** (exit 0).
- `npm run lint`: **passes** with 0 errors and 14 warnings after the follow-up
  fix in this session (ignore `.sdrive/**` and `convex/_generated/**` in the flat
  config, and defer the carousel's initial select to the next frame). NFR-003 is
  recorded as `complete`.
