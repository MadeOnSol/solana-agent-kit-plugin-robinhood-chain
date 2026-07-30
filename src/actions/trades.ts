import { z } from "zod";
import { trades } from "../tools/index.js";

export const tradesAction = {
  name: "RHC_TRADES_ACTION",
  similes: ["robinhood chain trades", "rhc dex trade tape", "rhc swaps", "robinhood chain firehose"],
  description:
    "Get the Robinhood Chain DEX trade tape — every Uniswap v2/v3/v4 swap on chain 4663, each row carrying the effective trading account (trader_eoa — tx.from normally, or the ERC-4337 userOp sender when the trade was bundled; never the router or the bundler), gas/ordering for MEV analysis, pool state, and KOL/deployer flags. Filter by token, dex, action, min_eth. PRO+.",
  examples: [
    [{ input: { token: "0x1234567890abcdef1234567890abcdef12345678", limit: 25 }, output: { status: "success" }, explanation: "Latest 25 RHC swaps for one token" }],
  ],
  schema: z.object({
    limit: z.number().min(1).max(100).default(50).describe("Rows to return"),
    token: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().describe("Filter to one token address"),
    dex: z.enum(["uniswap-v2", "uniswap-v3", "uniswap-v4"]).optional().describe("Filter by DEX version"),
    action: z.enum(["buy", "sell"]).optional().describe("Filter by side"),
    min_eth: z.number().min(0).optional().describe("Minimum trade size in ETH"),
    before: z.string().optional().describe("Cursor: block_time, trades strictly older"),
  }),
  handler: async (agent: unknown, input: { limit?: number; token?: string; dex?: "uniswap-v2" | "uniswap-v3" | "uniswap-v4"; action?: "buy" | "sell"; min_eth?: number; before?: string }) => {
    try {
      return { status: "success", result: await trades(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
