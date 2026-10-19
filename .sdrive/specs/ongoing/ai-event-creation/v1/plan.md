# Technical Plan: AI Event Creation

> Retroactive plan reconstructed from the existing implementation.

## Approach

A client dialog collects a free-text prompt and posts `{ prompt }` to the
Next.js route handler at `app/api/generate-event/route.ts`. The handler lazily
constructs a Cerebras client from `process.env.CEREBRAS_API_KEY`, sends a
constrained system prompt with `response_format: { type: "json_object" }`, and
returns the parsed draft. The create-event page maps the draft onto form fields;
the normal `events.createEvent` mutation still performs the only write.

## Components

| Component | Action | Responsibility |
| --- | --- | --- |
| `app/api/generate-event/route.ts` | reuse | Validate prompt, call Cerebras, return the draft or an error. |
| `app/(main)/create-event/_components/ai-event-creator.tsx` | reuse | Dialog, prompt state, request, success/error toasts. |
| `app/(main)/create-event/page.tsx` | reuse | `handleAIGenerate` maps the draft into react-hook-form fields. |
| `components/ui/dialog.tsx` | reuse | Dialog primitives. |
| `components/ui/textarea.tsx` | reuse | Prompt input. |
| `components/ui/button.tsx` | reuse | Trigger, Cancel, Generate. |

## Data Model

No entities change. The wire contract is:

```
POST /api/generate-event
{ "prompt": string }
→ 200 { title, description, category, suggestedCapacity, suggestedTicketType }
→ 400 { error } when prompt is absent
→ 500 { error } when the provider or parsing fails
```

The form maps `suggestedCapacity` → `capacity` and
`suggestedTicketType` → `ticketType`.

## Flow

1. The organizer opens the dialog from the create-event header and writes a prompt.
2. `generateEvent` posts to the route; the button is disabled while loading.
3. The route validates the prompt, calls `chat.completions.create` with
   `temperature: 0.7` and JSON response format, and parses `choices[0].message.content`.
4. On success the draft is returned and `handleAIGenerate` fills the form; on a
   thrown error the client shows a toast.
5. Saving still goes through the validated create-event form and `createEvent`.

## Security

- NFR-001: the API key is read only inside the route handler; it is never
  serialized into the response or imported by a client component.
- Known gap: the route does not check for a session.

## Performance

- The provider call is the only slow step; the dialog shows a spinner and
  disables the action while it runs.
- The route is stateless and creates the client once per process.

## Dependencies

`@cerebras/cerebras_cloud_sdk`, Next.js route handlers, react-hook-form, sonner,
Tailwind. All are installed.

## Risks

- Publicly callable route with no rate limit.
- No schema validation of the model output.
- The client does not check `response.ok`.
