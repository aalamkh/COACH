/**
 * Rough pricing constants, USD per 1M tokens.
 * We only store total `token_cost` per call (input + output blended), so USD
 * estimates apply a fixed 70/30 input/output split per model. Numbers are
 * approximations; treat them as ballpark, not accounting.
 */
export interface ModelPrice {
  id: string;
  label: string;
  inputPerM: number;
  outputPerM: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-opus-4-7": {
    id: "claude-opus-4-7",
    label: "Opus",
    inputPerM: 15,
    outputPerM: 75,
  },
  "claude-sonnet-4-6": {
    id: "claude-sonnet-4-6",
    label: "Sonnet",
    inputPerM: 3,
    outputPerM: 15,
  },
  "claude-haiku-4-5-20251001": {
    id: "claude-haiku-4-5-20251001",
    label: "Haiku",
    inputPerM: 0.8,
    outputPerM: 4,
  },
};

const INPUT_SHARE = 0.7;
const OUTPUT_SHARE = 0.3;

/** Blended $/M for a model id. Returns 0 for unknown models. */
export function blendedRate(modelId: string | null | undefined): number {
  if (!modelId) return 0;
  const p = MODEL_PRICES[modelId];
  if (!p) return 0;
  return INPUT_SHARE * p.inputPerM + OUTPUT_SHARE * p.outputPerM;
}

/** Estimate USD given a token count + model id. */
export function estimateUsd(tokens: number, modelId: string | null | undefined): number {
  if (!tokens || tokens <= 0) return 0;
  return (tokens / 1_000_000) * blendedRate(modelId);
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return "<$0.01";
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n === 0) return "0";
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function modelLabel(modelId: string | null | undefined): string {
  if (!modelId) return "unknown";
  return MODEL_PRICES[modelId]?.label ?? modelId;
}
