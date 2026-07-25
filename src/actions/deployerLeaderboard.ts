import { z } from "zod";
import { deployerLeaderboard } from "../tools/index.js";

export const deployerLeaderboardAction = {
  name: "RHC_DEPLOYER_LEADERBOARD_ACTION",
  similes: ["robinhood chain deployer leaderboard", "rhc top deployers", "best deployers on robinhood chain", "rhc deployer reputation ranking"],
  description:
    "Get the Robinhood Chain deployer reputation leaderboard. Most RHC launchpads are direct-to-DEX, so graduation is a market-cap milestone: graduation_rate = share of a deployer's tokens that hit $40K+ peak MC; runner_rate = share that hit $100K+. tier is elite/good/neutral/spammer — elite and good are earned on runner_rate ($100K) and require deploy history; graduation_rate is still returned but no longer sets the tier (the $40K bar proved farmable). Sortable and filterable by tier/min_tokens. BASIC+.",
  examples: [
    [{ input: { sort: "graduation_rate", limit: 20 }, output: { status: "success" }, explanation: "Top 20 RHC deployers by graduation rate" }],
  ],
  schema: z.object({
    sort: z.enum(["graduation_rate", "runner_rate", "tokens_deployed", "best_peak_mc_usd", "last_deploy_at"]).default("graduation_rate").describe("Ordering (descending, NULLs last)"),
    tier: z.enum(["elite", "good", "neutral", "spammer"]).optional().describe("Filter to one reputation tier"),
    min_tokens: z.number().min(1).max(100000).default(3).describe("Minimum tokens deployed"),
    limit: z.number().min(1).max(50).default(20).describe("Rows to return"),
    offset: z.number().min(0).max(10000).default(0).describe("Pagination offset"),
  }),
  handler: async (agent: unknown, input: { sort?: "graduation_rate" | "runner_rate" | "tokens_deployed" | "best_peak_mc_usd" | "last_deploy_at"; tier?: "elite" | "good" | "neutral" | "spammer"; min_tokens?: number; limit?: number; offset?: number }) => {
    try {
      return { status: "success", result: await deployerLeaderboard(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
