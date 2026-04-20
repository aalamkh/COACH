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
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
    config: {
      systemInstruction: params.systemPrompt,
      temperature: params.temperature ?? 0.4,
      maxOutputTokens: params.maxOutputTokens ?? 1000,
    },
  });
  const text = response.text ?? "";
  return {
    text,
    tokenCost: sumTokens(response.usageMetadata ?? undefined),
    model: modelId,
  };
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
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts: [{ text: params.userPrompt }] }],
    config: {
      systemInstruction: params.systemPrompt,
      temperature: params.temperature ?? 0.3,
      maxOutputTokens: params.maxOutputTokens ?? 2000,
      responseMimeType: "application/json",
      responseSchema: params.schema,
    },
  });
  const text = response.text ?? "";
  const raw = JSON.parse(text);
  const data = params.zodSchema.parse(raw);
  return {
    data,
    tokenCost: sumTokens(response.usageMetadata ?? undefined),
    model: modelId,
  };
}

export { Type };
