import { z } from "zod";
import { deployerAlerts } from "../tools/index.js";

export const deployerAlertsAction = {
  name: "RHC_DEPLOYER_ALERTS_ACTION",
  similes: ["robinhood chain deployer alerts", "rhc deployer alert feed", "new deploys on robinhood chain", "rhc deployer signals"],
  description:
    "Get the live Robinhood Chain deployer alert feed — new_deploy and graduated events from tracked deployers, newest first, each with token, launchpad, mc_at_alert, current_mc_usd, liquidity_usd and priority (high/medium). A tradability filter runs BY DEFAULT (liquidity_usd >= $100, unknown liquidity fails) so drained pools are not served as buy signals — set include_untradeable=true for the raw tape; the response echoes tradability_filter either way. The deployer tier is resolved at READ time from the live reputation table: tier is current, tier_at_alert is the snapshot taken when the alert fired, and tier_is_stale flags drift. Tiers ride runner_rate ($100K peak MC), so alert copy justifies them with runners, not the $40K graduation rate. Poll forward with since, page back with before/next_before. BASIC+ — ULTRA gets the full limit, BASIC/PRO share a 50-alert cap.",
  examples: [
    [{ input: { deployer_tier: "elite", limit: 50 }, output: { status: "success" }, explanation: "Tradeable RHC alerts from elite-tier deployers" }],
  ],
  schema: z.object({
    deployer_tier: z.enum(["elite", "good", "neutral", "spammer"]).optional().describe("Filter on the CURRENT (read-time) tier, not the snapshot"),
    priority: z.enum(["high", "medium"]).optional().describe("Alert priority (RHC has no 'low')"),
    alert_type: z.enum(["new_deploy", "graduated"]).optional().describe("Event type (RHC has no bonded/kol_buy types)"),
    launchpad: z.string().optional().describe("Filter by launchpad: pons, flap, clanker, hood.fun, noxa, virtuals"),
    min_mc: z.number().min(0).optional().describe("Minimum market cap at the time the alert fired"),
    limit: z.number().min(1).max(500).default(50).describe("Alerts to return (BASIC/PRO capped at 50; ULTRA up to 500)"),
    offset: z.number().min(0).max(10000).default(0).describe("Pagination offset (ignored when before is set)"),
    since: z.string().optional().describe("Poll forward — only alerts strictly newer than this ISO 8601 timestamp. Pass back next_event_at."),
    before: z.string().optional().describe("Page back — only alerts strictly older than this ISO 8601 timestamp. Pass back next_before."),
    include_untradeable: z.boolean().default(false).describe("true disables the default liquidity_usd >= $100 gate (raw tape)"),
  }),
  handler: async (
    agent: unknown,
    input: {
      deployer_tier?: "elite" | "good" | "neutral" | "spammer";
      priority?: "high" | "medium";
      alert_type?: "new_deploy" | "graduated";
      launchpad?: string;
      min_mc?: number;
      limit?: number;
      offset?: number;
      since?: string;
      before?: string;
      include_untradeable?: boolean;
    },
  ) => {
    try {
      return { status: "success", result: await deployerAlerts(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
