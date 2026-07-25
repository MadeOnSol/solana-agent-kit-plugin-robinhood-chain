import { z } from "zod";
import { kolCoordination } from "../tools/index.js";

export const kolCoordinationAction = {
  name: "RHC_KOL_COORDINATION_ACTION",
  similes: ["robinhood chain kol coordination", "rhc multiple kols buying same token", "rhc kol clustering", "coordinated kol buys on robinhood chain"],
  description:
    "Get KOL coordination / clustering on Robinhood Chain — tokens bought by min_kols+ DISTINCT tracked KOLs inside the window, ranked by KOL count then buy ETH. Per token: buy/sell/net ETH, signal ('accumulating' when net_eth >= 0, else 'distributing'), exited_count vs holders_count, time_to_consensus_sec (first→last KOL buy), MC at the first KOL buy, current/peak MC, liquidity, deployer_tier, token age, and the per-KOL breakdown (evm_address, name, twitter_url, buy_eth, sell_eth, exited). Computed read-time from the RHC KOL tape — RHC has no KOL winrate/strategy scores, so those Solana fields are absent. BASIC+.",
  examples: [
    [{ input: { period: "6h", min_kols: 3, limit: 20 }, output: { status: "success" }, explanation: "RHC tokens co-bought by 3+ KOLs in the last 6h" }],
  ],
  schema: z.object({
    period: z.enum(["1h", "6h", "24h", "7d"]).default("24h").describe("Rolling window over KOL buys"),
    min_kols: z.number().min(2).max(50).default(2).describe("Minimum distinct KOL buyers for a token to qualify (2-50)"),
    limit: z.number().min(1).max(50).default(20).describe("Tokens to return"),
    min_mc_usd: z.number().min(0).optional().describe("Minimum market cap at the FIRST KOL buy (tokens with unknown MC are dropped when a band is set)"),
    max_mc_usd: z.number().min(0).optional().describe("Maximum market cap at the first KOL buy — must be >= min_mc_usd"),
  }),
  handler: async (agent: unknown, input: { period?: "1h" | "6h" | "24h" | "7d"; min_kols?: number; limit?: number; min_mc_usd?: number; max_mc_usd?: number }) => {
    try {
      return { status: "success", result: await kolCoordination(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
