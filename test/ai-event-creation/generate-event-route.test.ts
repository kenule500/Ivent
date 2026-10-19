import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

const cerebras = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@cerebras/cerebras_cloud_sdk", () => ({
  Cerebras: class {
    chat = { completions: { create: cerebras.create } };
  },
}));

import { POST } from "../../app/api/generate-event/route";

const validPayload = {
  title: "React 19 Meetup",
  description: "A meetup about React 19.",
  category: "tech",
  suggestedCapacity: 50,
  suggestedTicketType: "free",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/generate-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function modelReply(content: string) {
  return { choices: [{ message: { content } }] };
}

describe("AC-002: stable server contract", () => {
  beforeEach(() => {
    process.env.CEREBRAS_API_KEY = "test-key";
    cerebras.create.mockReset();
  });

  test("AC-002: a missing prompt returns 400 with an error", async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Prompt is required" });
  });

  test("AC-002: a valid prompt returns the generated JSON shape", async () => {
    cerebras.create.mockResolvedValue(modelReply(JSON.stringify(validPayload)));

    const res = await POST(request({ prompt: "A React meetup" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(validPayload);
    expect(cerebras.create).toHaveBeenCalledOnce();
  });
});

describe("AC-003: provider key stays server-side", () => {
  beforeEach(() => {
    cerebras.create.mockReset();
  });

  afterEach(() => {
    process.env.CEREBRAS_API_KEY = "test-key";
  });

  test("AC-003: a missing key produces a clear server error and leaks no key", async () => {
    delete process.env.CEREBRAS_API_KEY;

    const res = await POST(request({ prompt: "A React meetup" }));
    const body = await res.text();

    expect(res.status).toBe(500);
    expect(body).toContain("CEREBRAS_API_KEY");
    expect(cerebras.create).not.toHaveBeenCalled();
    expect(body).not.toContain("test-key");
  });

  test("AC-003: with a key configured, the key never appears in the response", async () => {
    process.env.CEREBRAS_API_KEY = "sk-super-secret";
    cerebras.create.mockResolvedValue(modelReply(JSON.stringify(validPayload)));

    const res = await POST(request({ prompt: "A React meetup" }));
    const body = await res.text();

    expect(body).not.toContain("sk-super-secret");
    expect(body).not.toContain("CEREBRAS_API_KEY");
  });
});

describe("AC-005: failing safely on the server", () => {
  beforeEach(() => {
    process.env.CEREBRAS_API_KEY = "test-key";
    cerebras.create.mockReset();
  });

  test("AC-005: a provider failure returns 500 instead of crashing", async () => {
    cerebras.create.mockRejectedValue(new Error("provider down"));

    const res = await POST(request({ prompt: "A React meetup" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("provider down"),
    });
  });

  test("AC-005: malformed model JSON returns 500", async () => {
    cerebras.create.mockResolvedValue(modelReply("not-json"));

    const res = await POST(request({ prompt: "A React meetup" }));

    expect(res.status).toBe(500);
  });
});
