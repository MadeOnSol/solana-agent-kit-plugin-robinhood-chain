import { z } from "zod";
import { tokensBatchBuyerQuality } from "../tools/index.js";

export const tokensBatchBuyerQualityAction = {
  name: "RHC_TOKENS_BATCH_BUYER_QUALITY_ACTION",
  similes: ["robinhood chain batch buyer quality", "score several rhc tokens early buyers", "rhc bulk buyer quality", "compare rhc buyer cohorts"],
  description:
    "Score the early-buyer cohorts of several Robinhood Chain tokens in ONE request — each entry is the same 0–100 read as the single-token endpoint (score, confidence, signal, and the breakdown: early_buyers_analyzed, alpha_wallet_count, kol_count, bundle_buyer_count, dump_cluster_count, recycled_early_buyer_count, avg_historical_win_rate, bot_dominated). MAX 20 ADDRESSES — deliberately lower than the Solana batch cap of 50, because RHC buyer-quality is a per-token cohort computation, not a set-based lookup. A token that fails to score degrades to an error entry rather than failing the whole batch. BASIC+.",
  examples: [
    [{ input: { addresses: ["0x1234567890abcdef1234567890abcdef12345678", "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"] }, output: { status: "success" }, explanation: "Buyer-quality scores for two RHC tokens in one call" }],
  ],
  schema: z.object({
    addresses: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).min(1).max(20).describe("1-20 Robinhood Chain token addresses (0x, 40 hex) — the cap is 20, not 50"),
  }),
  handler: async (agent: unknown, input: { addresses: string[] }) => {
    try {
      return { status: "success", result: await tokensBatchBuyerQuality(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
