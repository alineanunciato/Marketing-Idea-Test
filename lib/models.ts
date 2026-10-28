export const MODELS = ["claude", "openai", "gemini"] as const;
export type Model = (typeof MODELS)[number];

export const MODEL_LABELS: Record<string, string> = {
  claude: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};
