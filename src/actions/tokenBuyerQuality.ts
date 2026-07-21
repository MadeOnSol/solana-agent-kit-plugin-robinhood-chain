import { z } from "zod";
import { tokenBuyerQuality } from "../tools/index.js";

export const tokenBuyerQualityAction = {
  name: "RHC_BUYER_QUALITY_ACTION",
  similes: ["robinhood chain buyer quality", "rhc early buyer score", "is this robinhood chain token quality", "rhc buyer cohort score"],
  description:
    "Get a 0–100 early-buyer quality read on a Robinhood Chain token's first-20 distinct buyer cohort: win-rate, KOL presence, bot-domination and bundle-buyer legs, plus the informational dump-cluster ensemble (dump_cluster_count). Returns score, confidence, signal, and a breakdown. BASIC+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Buyer-quality score for one RHC token" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Token address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await tokenBuyerQuality(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
