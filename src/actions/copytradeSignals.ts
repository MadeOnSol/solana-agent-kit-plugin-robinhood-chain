import { z } from "zod";
import { copytradeSignals } from "../tools/index.js";

export const copytradeSignalsAction = {
  name: "RHC_COPYTRADE_SIGNALS_ACTION",
  similes: [
    "robinhood chain copy trade signals",
    "rhc copytrade fire history",
    "what did my rhc copy trade rules fire",
    "missed rhc copytrade webhooks",
  ],
  description:
    "Fire history for your Robinhood Chain copy-trade rules, newest first — the source wallet, buy/sell, token, the source's ETH size, the suggested_eth_amount your sizing mode computed, price, DEX, tx hash, and whether delivery succeeded. This is the CATCH-UP path for a missed webhook or a dropped WebSocket connection, not a live stream. Retained 7 days. Filter to one rule with subscription_id, or forward from a timestamp with since. PRO+.",
  examples: [
    [{ input: { limit: 100 }, output: { status: "success" }, explanation: "Last 100 copy-trade signals across all your RHC rules" }],
    [{ input: { subscription_id: 12, since: "2026-08-01T00:00:00Z" }, output: { status: "success" }, explanation: "Replay one rule's fires since a timestamp" }],
  ],
  schema: z.object({
    limit: z.number().int().min(1).max(500).default(50).describe("Number of signals (1-500)"),
    subscription_id: z.number().int().positive().optional().describe("Restrict to one copy-trade rule you own"),
    since: z.string().optional().describe("Only signals fired at or after this instant (ISO 8601 with offset)"),
  }),
  handler: async (agent: unknown, input: { limit?: number; subscription_id?: number; since?: string }) => {
    try {
      return { status: "success", result: await copytradeSignals(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
