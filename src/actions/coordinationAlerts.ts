import { z } from "zod";
import {
  coordinationAlertRules,
  coordinationAlertRule,
  createCoordinationAlertRule,
  updateCoordinationAlertRule,
  deleteCoordinationAlertRule,
} from "../tools/index.js";

export const coordinationAlertsAction = {
  name: "RHC_COORDINATION_ALERTS_ACTION",
  similes: [
    "robinhood chain coordination alerts",
    "rhc kol coordination alert rules",
    "alert me when kols pile into an rhc token",
    "pause my robinhood chain coordination alert",
    "delete rhc coordination alert rule",
  ],
  description:
    "Manage Robinhood Chain KOL coordination alert rules — list, get, create, update or delete. A rule fires when min_kols+ DISTINCT tracked KOLs buy the same RHC token inside window_minutes, subject to a minimum score, a cooldown, an optional market-cap band, and a score_jump_break that lets a materially stronger signal re-fire inside the cooldown. Be precise about the score: it is the shared v1 scorer so the number is comparable to Solana, but on RHC the quality component is real (KOL 7-day win rate) while earliness is DEFAULTED to 50 — RHC has no early-entry equivalent — and every fired signal records which components were real in score_inputs. The rule quota is PER CHAIN. Rule ids are UUIDs. webhook_url is required on create unless delivery_mode is websocket, and the returned webhook_secret is shown ONCE. PRO+.",
  examples: [
    [{ input: { op: "list" }, output: { status: "success" }, explanation: "List your RHC coordination alert rules" }],
    [
      {
        input: { op: "create", min_kols: 4, window_minutes: 15, min_score: 60, cooldown_min: 30, delivery_mode: "websocket" },
        output: { status: "success" },
        explanation: "Fire when 4+ KOLs buy the same RHC token within 15 minutes at score 60+",
      },
    ],
    [{ input: { op: "update", id: "0f9c2b1a-4d3e-4a5b-8c7d-1e2f3a4b5c6d", is_active: false }, output: { status: "success" }, explanation: "Pause a rule by UUID" }],
  ],
  schema: z.object({
    op: z.enum(["list", "get", "create", "update", "delete"]).default("list").describe("What to do. Defaults to listing your rules."),
    id: z.string().uuid().optional().describe("Rule id (UUID) — required for get, update and delete"),
    name: z.string().min(1).max(64).nullable().optional().describe("Human label for the rule"),
    min_kols: z.number().int().min(2).max(50).optional().describe("Distinct tracked KOLs that must buy inside the window (default 3)"),
    window_minutes: z.number().int().min(1).max(60).optional().describe("Rolling window in minutes (default 15)"),
    min_score: z.number().int().min(0).max(100).optional().describe("Minimum coordination score to fire (default 0). Earliness is defaulted on RHC; quality is real."),
    cooldown_min: z.number().int().min(1).max(1440).optional().describe("Minutes before the same token can fire again (default 30)"),
    score_jump_break: z.number().int().min(0).max(100).optional().describe("Re-fire inside the cooldown when the score jumps this much (default 20)"),
    min_mc_usd: z.number().min(0).max(1e12).nullable().optional().describe("Only tokens at or above this market cap"),
    max_mc_usd: z.number().min(0).max(1e12).nullable().optional().describe("Only tokens at or below this market cap — must be >= min_mc_usd"),
    delivery_mode: z.enum(["websocket", "webhook", "both"]).optional().describe("Where the alert goes (default websocket)"),
    webhook_url: z.string().url().nullable().optional().describe("HTTPS webhook URL — required unless delivery_mode is websocket"),
    is_active: z.boolean().optional().describe("Pause (false) or resume (true) the rule"),
  }),
  handler: async (
    agent: unknown,
    input: {
      op?: "list" | "get" | "create" | "update" | "delete";
      id?: string;
      name?: string | null;
      min_kols?: number;
      window_minutes?: number;
      min_score?: number;
      cooldown_min?: number;
      score_jump_break?: number;
      min_mc_usd?: number | null;
      max_mc_usd?: number | null;
      delivery_mode?: "websocket" | "webhook" | "both";
      webhook_url?: string | null;
      is_active?: boolean;
    },
  ) => {
    const { op = "list", id, ...rest } = input;
    try {
      if (op === "list") return { status: "success", result: await coordinationAlertRules(agent) };

      if (op === "create") {
        return {
          status: "success",
          result: await createCoordinationAlertRule(agent, {
            ...rest,
            name: rest.name ?? undefined,
            webhook_url: rest.webhook_url ?? undefined,
          }),
        };
      }

      if (id === undefined) return { status: "error", message: `${op} requires a rule id (UUID)` };
      if (op === "get") return { status: "success", result: await coordinationAlertRule(agent, { id }) };
      if (op === "delete") return { status: "success", result: await deleteCoordinationAlertRule(agent, { id }) };
      return { status: "success", result: await updateCoordinationAlertRule(agent, { id, ...rest }) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
