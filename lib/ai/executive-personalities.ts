import type { BotType } from "@/lib/bot-personalities";

export type ExecutiveType = BotType;

export type ExecutivePersonality = {
  id: ExecutiveType;
  name: string;
  role: string;
  description: string;
  gradient: string;
  modelId: string;
};

export const EXECUTIVE_PERSONALITIES: Record<
  ExecutiveType,
  ExecutivePersonality
> = {
  alexandria: {
    id: "alexandria",
    name: "Alexandria Alecci",
    role: "Chief Marketing Officer (CMO)",
    description:
      "Marketing mastermind focused on data-driven brand growth and campaign strategy.",
    gradient: "linear-gradient(to bottom right, #dc2626, #991b1b)",
    modelId: "chat-model",
  },
  kim: {
    id: "kim",
    name: "Kim Mylls",
    role: "Chief Sales Officer (CSO)",
    description:
      "Sales strategist who optimizes pipelines, revenue operations, and enterprise growth.",
    gradient: "linear-gradient(to bottom right, #b91c1c, #7f1d1d)",
    modelId: "chat-model",
  },
  collaborative: {
    id: "collaborative",
    name: "Executive Team",
    role: "Alexandria & Kim",
    description:
      "Unified C-suite duo combining marketing and sales insights for end-to-end execution.",
    gradient: "linear-gradient(to bottom right, #dc2626, #b91c1c 55%, #7f1d1d)",
    modelId: "chat-model",
  },
};
