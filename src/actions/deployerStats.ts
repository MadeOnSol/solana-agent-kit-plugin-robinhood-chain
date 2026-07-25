import { z } from "zod";
import { deployerStats } from "../tools/index.js";

export const deployerStatsAction = {
  name: "RHC_DEPLOYER_STATS_ACTION",
  similes: ["robinhood chain deployer stats", "rhc deployer tier breakdown", "how many deployers on robinhood chain", "rhc deployer spam rate"],
  description:
    "Get the chain-wide Robinhood Chain deployer reputation summary — total_deployers, total_tokens, deployer/token population per tier (by_tier), reputable_deployers (elite+good), spam_token_share, and alerts_24h / alerts_7d. Also returns tier_rules, the thresholds actually in force: elite and good are earned on runner_rate (peak MC >= $100,000) and require deploy history; spammer keys off graduation_rate (peak MC >= $40,000). graduation_rate is still reported everywhere but no longer sets the tier — the $40K bar proved farmable. BASIC+.",
  examples: [
    [{ input: {}, output: { status: "success" }, explanation: "Chain-wide RHC deployer reputation summary" }],
  ],
  schema: z.object({}),
  handler: async (agent: unknown) => {
    try {
      return { status: "success", result: await deployerStats(agent) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
