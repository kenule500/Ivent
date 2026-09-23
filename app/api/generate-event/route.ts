import { Cerebras } from "@cerebras/cerebras_cloud_sdk";
import { NextRequest, NextResponse } from "next/server";

// 1. Define a strict, linter-approved interface for the Cerebras response shape
interface CerebrasCompletion {
  choices: Array<{
    message: {
      content: string | null;
    };
  }>;
}

// Initialize the official Cerebras client (lazy load to avoid build errors)
let client: Cerebras | null = null;

function getClient(): Cerebras {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing CEREBRAS_API_KEY environment variable");
  }
  if (!client) {
    client = new Cerebras({ apiKey });
  }
  return client;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an event planning assistant. Generate event details based on the user's description.

    CRITICAL: Return ONLY valid JSON with properly escaped strings. No newlines in string values - use spaces instead.

    Return this exact JSON structure:
    {
      "title": "Event title (catchy and professional, single line)",
      "description": "Detailed event description in a single paragraph. Use spaces instead of line breaks. Make it 2-3 sentences describing what attendees will learn and experience.",
      "category": "One of: tech, music, sports, art, food, business, health, education, gaming, networking, outdoor, community",
      "suggestedCapacity": 50,
      "suggestedTicketType": "free"
    }

    User's event idea: ${prompt}

    Rules:
    - Return ONLY the JSON object, no markdown wrappers, no explanation.
    - All string values must be on a single line with no line breaks.
    - Use spaces instead of \\n or line breaks in description.
    - Make title catchy and under 80 characters.
    - Description should be 2-3 sentences, informative, single paragraph.
    - suggestedTicketType should be either "free" or "paid".
    `;

    // Define parameters cleanly
    const params: Cerebras.Chat.ChatCompletionCreateParams = {
      model: "gemma-4-31b", // Fast, accurate engine model
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
      response_format: { type: "json_object" }, // Guarantees JSON structured output
      temperature: 0.7,
    };

    // Make the ultra-fast completion call
    const response = await getClient().chat.completions.create(params);

    // 2. Safe Double-Casting to bypass both "unknown" and "no-explicit-any" ESLint checks
    const text = (response as unknown as CerebrasCompletion).choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Empty response returned from Cerebras.");
    }

    // Since we forced response_format: "json_object", we can parse safely
    const eventData = JSON.parse(text.trim());

    return NextResponse.json(eventData);
  } catch (error) {
    console.error("Error generating event with Cerebras:", error);
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json(
      { error: `Failed to generate event: ${errorMessage}` },
      { status: 500 }
    );
  }
}