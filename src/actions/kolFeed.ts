import { z } from "zod";
import { kolFeed } from "../tools/index.js";

export const kolFeedAction = {
  name: "RHC_KOL_FEED_ACTION",
  similes: ["robinhood chain kol trades", "rhc kol feed", "what are kols buying on robinhood chain", "rhc smart money trades"],
  description:
    "Get the real-time KOL trade feed on Robinhood Chain (chain id 4663) via the MadeOnSol RHC API. Every buy/sell from tracked KOLs' verified EVM wallets, enriched with launchpad, deployer tier, current MC, and mc_multiple_since_trade. EVM-native (token_address, eth_amount, tx_hash). BASIC+.",
  examples: [
    [{ input: { limit: 10, action: "buy" }, output: { status: "success" }, explanation: "10 most recent RHC KOL buys" }],
  ],
  schema: z.object({
    limit: z.number().min(1).max(100).default(10).describe("Number of trades"),
    action: z.enum(["buy", "sell"]).optional().describe("Filter by trade type"),
    kol: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().describe("Filter to one KOL EVM wallet (0x)"),
    min_eth: z.number().min(0).optional().describe("Minimum trade size in ETH"),
    before: z.string().optional().describe("Cursor: ISO timestamp, trades strictly older"),
  }),
  handler: async (agent: unknown, input: { limit?: number; action?: "buy" | "sell"; kol?: string; min_eth?: number; before?: string }) => {
    try {
      return { status: "success", result: await kolFeed(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
