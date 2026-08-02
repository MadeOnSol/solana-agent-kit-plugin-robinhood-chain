import { z } from "zod";
import { priceAlertEvents } from "../tools/index.js";

export const priceAlertEventsAction = {
  name: "RHC_PRICE_ALERT_EVENTS_ACTION",
  similes: [
    "robinhood chain price alert events",
    "rhc price alert fire history",
    "which rhc price alerts fired",
    "missed rhc price alert webhooks",
  ],
  description:
    "Dip and recovery fire history for your Robinhood Chain price alerts, newest first — each event carries the baseline MC, the market cap at fire time, the actual drop or recovery percentage, the dip low, and whether delivery succeeded. This is the CATCH-UP path for a missed webhook or a dropped WebSocket connection, not a live stream. Retained 30 days. Filter to dips only, recoveries only, one alert, or forward from a timestamp. PRO+.",
  examples: [
    [{ input: { event_type: "dip", limit: 100 }, output: { status: "success" }, explanation: "The last 100 dip fires across your RHC alerts" }],
    [{ input: { alert_id: 7, since: "2026-08-01T00:00:00Z" }, output: { status: "success" }, explanation: "Replay one alert's fires since a timestamp" }],
  ],
  schema: z.object({
    limit: z.number().int().min(1).max(500).default(50).describe("Number of events (1-500)"),
    event_type: z.enum(["dip", "recovery"]).optional().describe("Only dip fires or only recovery fires"),
    since: z.string().optional().describe("Only events fired at or after this instant (ISO 8601 with offset)"),
    alert_id: z.number().int().positive().optional().describe("Restrict to one price alert you own"),
  }),
  handler: async (
    agent: unknown,
    input: { limit?: number; event_type?: "dip" | "recovery"; since?: string; alert_id?: number },
  ) => {
    try {
      return { status: "success", result: await priceAlertEvents(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
