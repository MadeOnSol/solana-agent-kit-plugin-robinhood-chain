import { z } from "zod";
import { priceAlerts, priceAlert, createPriceAlert, updatePriceAlert, deletePriceAlert } from "../tools/index.js";

const EVM = /^0x[0-9a-fA-F]{40}$/;

export const priceAlertsAction = {
  name: "RHC_PRICE_ALERTS_ACTION",
  similes: [
    "robinhood chain price alerts",
    "rhc price alerts",
    "create an rhc price alert",
    "pause my robinhood chain price alert",
    "delete rhc price alert",
  ],
  description:
    "Manage Robinhood Chain price alerts — list, get, create, update or delete. An alert is MARKET-CAP denominated: the baseline MC is captured at creation, and it fires on a drop_pct fall from that baseline, with an optional recovery_pct second leg measured off the dip low. LATENCY CAVEAT, do not gloss it: RHC alerts are evaluated on a ~15 SECOND POLL of the RHC price table, not a live price loop, so effective latency is that interval plus the token's own price-update cadence — they are NOT sub-second like the Solana price alerts, and a strategy sized on that assumption will be wrong. The token must already be tracked with a market cap or creation fails. Alerts expire 30 days after creation and the quota is PER CHAIN. token_address, drop_pct and recovery_pct are IMMUTABLE — delete and recreate to change a threshold. PRO+.",
  examples: [
    [{ input: { op: "list" }, output: { status: "success" }, explanation: "List your RHC price alerts" }],
    [
      {
        input: { op: "create", token_address: "0x1234567890abcdef1234567890abcdef12345678", drop_pct: 30, recovery_pct: 15, delivery_mode: "websocket" },
        output: { status: "success" },
        explanation: "Alert on a 30% MC drop, then again on a 15% recovery off the low",
      },
    ],
    [{ input: { op: "delete", id: 7 }, output: { status: "success" }, explanation: "Delete alert 7" }],
  ],
  schema: z.object({
    op: z.enum(["list", "get", "create", "update", "delete"]).default("list").describe("What to do. Defaults to listing your alerts."),
    id: z.number().int().positive().optional().describe("Numeric alert id — required for get, update and delete"),
    name: z.string().min(1).max(64).nullable().optional().describe("Human label for the alert"),
    token_address: z.string().regex(EVM).optional().describe("RHC token to watch (0x, 40 hex). Required on create; immutable afterwards."),
    drop_pct: z.number().min(0.01).max(99.99).optional().describe("Percent fall from the captured baseline market cap that fires the alert. Required on create; immutable afterwards."),
    recovery_pct: z.number().min(0.01).max(1000).optional().describe("Optional second leg — percent recovery off the dip low. Immutable after create."),
    delivery_mode: z.enum(["webhook", "websocket", "both"]).optional().describe("Where the alert goes (default webhook)"),
    webhook_url: z.string().url().nullable().optional().describe("HTTPS webhook URL — required unless delivery_mode is websocket"),
    is_active: z.boolean().optional().describe("Pause (false) or resume (true) the alert"),
  }),
  handler: async (
    agent: unknown,
    input: {
      op?: "list" | "get" | "create" | "update" | "delete";
      id?: number;
      name?: string | null;
      token_address?: string;
      drop_pct?: number;
      recovery_pct?: number;
      delivery_mode?: "webhook" | "websocket" | "both";
      webhook_url?: string | null;
      is_active?: boolean;
    },
  ) => {
    const { op = "list", id, ...rest } = input;
    try {
      if (op === "list") return { status: "success", result: await priceAlerts(agent) };

      if (op === "create") {
        if (!rest.token_address || rest.drop_pct === undefined) {
          return { status: "error", message: "create requires token_address and drop_pct" };
        }
        return {
          status: "success",
          result: await createPriceAlert(agent, {
            name: rest.name ?? undefined,
            token_address: rest.token_address,
            drop_pct: rest.drop_pct,
            recovery_pct: rest.recovery_pct,
            delivery_mode: rest.delivery_mode,
            webhook_url: rest.webhook_url ?? undefined,
          }),
        };
      }

      if (id === undefined) return { status: "error", message: `${op} requires a numeric alert id` };
      if (op === "get") return { status: "success", result: await priceAlert(agent, { id }) };
      if (op === "delete") return { status: "success", result: await deletePriceAlert(agent, { id }) };
      // token_address / drop_pct / recovery_pct are immutable — never forwarded on update.
      return {
        status: "success",
        result: await updatePriceAlert(agent, {
          id,
          name: rest.name,
          delivery_mode: rest.delivery_mode,
          webhook_url: rest.webhook_url,
          is_active: rest.is_active,
        }),
      };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
