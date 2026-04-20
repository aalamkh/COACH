import "server-only";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";
import { readSettings, MODEL_IDS } from "./env";
import type { ModelChoice } from "./env";

export class MissingApiKeyError extends Error {
  constructor() {
    super("GEMINI_API_KEY not set. Add it in /settings.");
    this.name = "MissingApiKeyError";
  }
}

export interface TextResult {
  text: string;
  tokenCost: number;
  model: string;
}

export interface JsonResult<T> {
  data: T;
  tokenCost: number;
  model: string;
}

function client(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

function modelFor(choice: ModelChoice): string {
  return MODEL_IDS[choice];
}

function sumTokens(usage: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
} | undefined): number {
  if (!usage) return 0;
  if (typeof usage.totalTokenCount === "number") return usage.totalTokenCount;
  return (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0);
}

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(503|UNAVAILABLE|overloaded|high demand|rate.?limit|429)\b/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err)) throw err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

/** Plain-text generation. */
export async function generateText(params: {
  systemPrompt: string;
  userPrompt: string;
  model: ModelChoice;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<TextResult> {
  const { apiKey } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();
  const modelId = modelFor(params.model);
  const ai = client(apiKey);
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
      config: {
        systemInstruction: params.systemPrompt,
        temperature: params.temperature ?? 0.4,
        maxOutputTokens: params.maxOutputTokens ?? 2000,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  );
  const text = response.text ?? "";
  return {
    text,
    tokenCost: sumTokens(response.usageMetadata ?? undefined),
    model: modelId,
  };
}

function stripJsonFences(text: string): string {
  // Gemini sometimes wraps JSON in ```json ... ``` despite responseMimeType.
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced && fenced[1]) return fenced[1].trim();
  return text.trim();
}

/** Structured JSON via responseSchema. Validates with Zod after. */
export async function generateJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  model: ModelChoice;
  schema: Schema;
  zodSchema: z.ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<JsonResult<T>> {
  const { apiKey } = await readSettings();
  if (!apiKey) throw new MissingApiKeyError();
  const modelId = modelFor(params.model);
  const ai = client(apiKey);
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
      config: {
        systemInstruction: params.systemPrompt,
        temperature: params.temperature ?? 0.3,
        maxOutputTokens: params.maxOutputTokens ?? 4000,
        responseMimeType: "application/json",
        responseSchema: params.schema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  );
  const text = stripJsonFences(response.text ?? "");
  if (!text) throw new Error("Gemini returned an empty response.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    const preview = text.slice(0, 100).replace(/\n/g, " ");
    throw new Error(
      `Gemini returned malformed JSON (${err instanceof Error ? err.message : "parse error"}). Response started: "${preview}"`,
    );
  }
  const data = params.zodSchema.parse(raw);
  return {
    data,
    tokenCost: sumTokens(response.usageMetadata ?? undefined),
    model: modelId,
  };
}

export { Type };
