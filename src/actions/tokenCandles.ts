import { z } from "zod";
import { tokenCandles } from "../tools/index.js";

export const tokenCandlesAction = {
  name: "RHC_TOKEN_CANDLES_ACTION",
  similes: ["robinhood chain candles", "rhc ohlc", "rhc token chart data", "price candles on robinhood chain"],
  description:
    "Get 1-minute OHLC candles for a Robinhood Chain token: price + market-cap OHLC, close liquidity, volume with buy/sell split, and trade/buy/sell counts, ordered oldest→newest. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678", limit: 240 }, output: { status: "success" }, explanation: "Last 240 one-minute RHC candles" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Token address (0x, 40 hex)"),
    limit: z.number().min(1).max(1000).default(240).describe("Number of candles (most recent first, returned chronological)"),
    from: z.string().optional().describe("Lower bound on bucket_start (ISO)"),
    to: z.string().optional().describe("Upper bound on bucket_start (ISO)"),
  }),
  handler: async (agent: unknown, input: { address: string; limit?: number; from?: string; to?: string }) => {
    try {
      return { status: "success", result: await tokenCandles(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
