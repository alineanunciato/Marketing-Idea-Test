import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { MODELS, type Model } from "./models";

const Suggestions = z.object({ names: z.array(z.string()) });

const SYSTEM_PROMPT = `You are a naming consultant for products, startups and side projects.
Given a one-line project description, suggest exactly 3 distinct names.
Each name should be short (1-3 words), memorable, easy to spell and say, and fit the project's tone.
Return only the names, with no explanations, numbering or taglines.`;

function userPrompt(description: string) {
  return `Project: ${description}`;
}

async function askClaude(description: string): Promise<string[]> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(description) }],
    output_config: { effort: "low", format: betaZodOutputFormat(Suggestions) },
    // If Claude's safety classifiers decline, let the API retry on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Claude returned no names (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output.names;
}

async function askOpenAI(description: string): Promise<string[]> {
  const client = new OpenAI();
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    instructions: SYSTEM_PROMPT,
    input: userPrompt(description),
    text: { format: zodTextFormat(Suggestions, "suggestions") },
  });
  if (!response.output_parsed) throw new Error("OpenAI returned no names");
  return response.output_parsed.names;
}

async function askGemini(description: string): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    contents: userPrompt(description),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(Suggestions),
    },
  });
  if (!response.text) throw new Error("Gemini returned no names");
  return Suggestions.parse(JSON.parse(response.text)).names;
}

const NAMERS: Record<Model, (description: string) => Promise<string[]>> = {
  claude: askClaude,
  openai: askOpenAI,
  gemini: askGemini,
};

// Trim, drop empties/duplicates, cap length, keep the first 3.
function clean(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw
      .replace(/^\s*(?:\d+[.)]\s+)?["'*\s-]*/, "")
      .replace(/["'*\s]+$/, "")
      .slice(0, 60);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
    if (result.length === 3) break;
  }
  return result;
}

export type ModelResult =
  | { model: Model; ok: true; names: string[] }
  | { model: Model; ok: false; error: string };

// Ask all three models in parallel; one model failing doesn't sink the others.
export async function suggestNames(description: string): Promise<ModelResult[]> {
  const settled = await Promise.allSettled(MODELS.map((model) => NAMERS[model](description)));
  return settled.map((result, i): ModelResult => {
    const model = MODELS[i];
    if (result.status === "rejected") {
      console.error(`[${model}]`, result.reason);
      return { model, ok: false, error: "This model couldn't come up with names right now." };
    }
    const names = clean(result.value);
    return names.length
      ? { model, ok: true, names }
      : { model, ok: false, error: "This model returned no usable names." };
  });
}
