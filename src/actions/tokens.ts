import { z } from "zod";
import { tokens } from "../tools/index.js";

export const tokensAction = {
  name: "RHC_TOKENS_ACTION",
  similes: ["robinhood chain tokens", "rhc token discovery", "list robinhood chain tokens", "top robinhood chain tokens"],
  description:
    "Discover Robinhood Chain tokens — live-priced tokens with market cap, liquidity, peak MC + drawdown, launchpad, and deployer reputation tier. Sortable (last_trade/market_cap/liquidity/peak_mc) and filterable by min_mc_usd, min_liquidity_usd, launchpad. PRO+.",
  examples: [
    [{ input: { sort: "market_cap", min_liquidity_usd: 5000, limit: 20 }, output: { status: "success" }, explanation: "Top RHC tokens by market cap with liquidity floor" }],
  ],
  schema: z.object({
    limit: z.number().min(1).max(100).default(50).describe("Rows to return"),
    sort: z.enum(["last_trade", "market_cap", "liquidity", "peak_mc"]).default("last_trade").describe("Ordering (descending)"),
    min_mc_usd: z.number().min(0).optional().describe("Minimum current market cap (USD)"),
    min_liquidity_usd: z.number().min(0).optional().describe("Minimum current liquidity (USD)"),
    launchpad: z.string().optional().describe("Filter by launchpad (pons, flap, clanker, hood.fun, noxa, virtuals)"),
  }),
  handler: async (agent: unknown, input: { limit?: number; sort?: "last_trade" | "market_cap" | "liquidity" | "peak_mc"; min_mc_usd?: number; min_liquidity_usd?: number; launchpad?: string }) => {
    try {
      return { status: "success", result: await tokens(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
