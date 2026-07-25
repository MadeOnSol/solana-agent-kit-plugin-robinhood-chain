import { z } from "zod";
import { deployerHistory } from "../tools/index.js";

export const deployerHistoryAction = {
  name: "RHC_DEPLOYER_HISTORY_ACTION",
  similes: ["robinhood chain deployer history", "rhc deployer full deploy history", "every token this rhc deployer ever made", "rhc deployer track record"],
  description:
    "Get a Robinhood Chain deployer's full deploy history — their reputation row (tier, graduation_rate, runner_rate, best_peak_mc_usd, launchpads, first/last deploy) plus every token they deployed, newest first, enriched with live MC, peak MC + peak time and graduation status. Deep pagination (limit up to 1000, offset up to 100000). Robinhood Chain has no per-day reputation snapshot table, so this is a token-deploy history, NOT a daily tier/rate time-series. Unknown wallets return is_deployer:false. PRO+ (the point-in-time deployer profile stays BASIC).",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678", limit: 100 }, output: { status: "success" }, explanation: "First 100 tokens of an RHC deployer's history" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Deployer EVM wallet address (0x, 40 hex)"),
    limit: z.number().min(1).max(1000).default(100).describe("Page size (1-1000)"),
    offset: z.number().min(0).max(100000).default(0).describe("Pagination offset"),
  }),
  handler: async (agent: unknown, input: { address: string; limit?: number; offset?: number }) => {
    try {
      return { status: "success", result: await deployerHistory(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
