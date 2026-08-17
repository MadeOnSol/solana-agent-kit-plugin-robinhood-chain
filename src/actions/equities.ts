import { z } from "zod";
import { equities } from "../tools/index.js";

export const equitiesAction = {
  name: "RHC_EQUITIES_ACTION",
  similes: ["robinhood chain equities", "robinhood tokenized stocks", "rhc tokenized etfs", "robinhood chain stock tokens", "nvda on robinhood chain"],
  description:
    "List Robinhood Chain tokenized equities — every official Robinhood tokenized stock and ETF (NVDA, SPY, AAPL…) with live price / market cap / liquidity and 24h trades, ETH volume, buys/sells and distinct buyers/sellers. Identity is the issuer BEACON (EIP-1967 beacon proxy on 0xe10b6f6b…151b00, read from our own node), never the name — look-alike 'GameStop • Robinhood Token' contracts are excluded by construction; issuer_beacon is echoed per row. Sortable by volume/trades/market_cap/last_trade/symbol; filter by exact ticker (symbol, case-insensitive) or substring (q). 24h stats cached 60 s. BASIC+.",
  examples: [
    [{ input: { sort: "volume", limit: 20 }, output: { status: "success" }, explanation: "Top 20 beacon-verified RHC equities by 24h ETH volume" }],
    [{ input: { symbol: "NVDA" }, output: { status: "success" }, explanation: "The official NVDA token on Robinhood Chain" }],
  ],
  schema: z.object({
    sort: z.enum(["volume", "trades", "market_cap", "last_trade", "symbol"]).default("volume").describe("Ordering (default volume = 24h ETH volume, descending; symbol ascending)"),
    limit: z.number().int().min(1).max(300).default(100).describe("Rows to return (1-300)"),
    symbol: z.string().optional().describe("Exact ticker, case-insensitive (e.g. NVDA)"),
    q: z.string().optional().describe("Substring of symbol or name"),
  }),
  handler: async (agent: unknown, input: { sort?: "volume" | "trades" | "market_cap" | "last_trade" | "symbol"; limit?: number; symbol?: string; q?: string }) => {
    try {
      return { status: "success", result: await equities(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
