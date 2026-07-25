import { z } from "zod";
import { deployerBestTokens } from "../tools/index.js";

export const deployerBestTokensAction = {
  name: "RHC_DEPLOYER_BEST_TOKENS_ACTION",
  similes: ["robinhood chain best tokens from good deployers", "rhc top tokens by reputable deployers", "best rhc launches this week", "what did elite robinhood chain deployers launch"],
  description:
    "Get the highest-peaking Robinhood Chain tokens launched by REPUTABLE deployers (elite or good tier) in a window — 24h, 7d, 30d or all time. Ranked by peak MC, each with live MC, peak MC + peak time, liquidity, launchpad and the deployer's tier / graduation_rate / runner_rate. Deliberately gated on deployer tier: this answers 'what did the deployers worth tracking actually produce', not 'what is the biggest token on the chain' (the unfiltered version is the tokens tool sorted by peak MC). Scans at most 1000 candidates — truncated:true means the top-N was drawn from the most RECENT launches in the window. BASIC+.",
  examples: [
    [{ input: { period: "7d", limit: 10 }, output: { status: "success" }, explanation: "Top 10 RHC tokens from elite/good deployers this week" }],
  ],
  schema: z.object({
    period: z.enum(["24h", "7d", "30d", "all"]).default("7d").describe("Launch window (filters on first_seen_at)"),
    limit: z.number().min(1).max(50).default(10).describe("Tokens to return (1-50)"),
  }),
  handler: async (agent: unknown, input: { period?: "24h" | "7d" | "30d" | "all"; limit?: number }) => {
    try {
      return { status: "success", result: await deployerBestTokens(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
