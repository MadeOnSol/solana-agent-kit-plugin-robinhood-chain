import { z } from "zod";
import {
  firstTouchSubscriptions,
  firstTouchSubscription,
  createFirstTouchSubscription,
  updateFirstTouchSubscription,
  deleteFirstTouchSubscription,
} from "../tools/index.js";

const EVM = /^0x[0-9a-fA-F]{40}$/;

const filtersSchema = z
  .object({
    kol: z.string().regex(EVM).optional().describe("Only first touches by this KOL (EVM address, lowercased on write)"),
    min_first_buy_eth: z.number().min(0).max(100000).optional().describe("Minimum size of the first buy, in ETH"),
    min_kol_winrate: z.number().min(0).max(1).optional().describe("Minimum KOL win rate, 0-1 (RHC's quality gate — there is no scout score on this chain)"),
    strategy: z.enum(["scalper", "day_trader", "swing", "inactive", "unscored"]).optional().describe("Only KOLs classified with this trading strategy"),
    min_mc_usd: z.number().min(0).max(1e12).optional().describe("Minimum market cap at the first touch"),
    max_mc_usd: z.number().min(0).max(1e12).optional().describe("Maximum market cap at the first touch — must be >= min_mc_usd"),
  })
  .strict();

export const firstTouchSubscriptionsAction = {
  name: "RHC_FIRST_TOUCH_SUBSCRIPTIONS_ACTION",
  similes: [
    "robinhood chain first touch subscriptions",
    "rhc first touch alerts",
    "notify me on the first kol buy on an rhc token",
    "pause my robinhood chain first touch subscription",
    "delete rhc first touch subscription",
  ],
  description:
    "Manage Robinhood Chain KOL first-touch subscriptions — list, get, create, update or delete. A subscription pushes when an RHC token gets its FIRST buy from any tracked KOL, the earliest discovery signal on the chain. The filter set is RHC-specific and deliberately narrower than Solana's: min_kol_winrate and strategy are the quality gates, because RHC has a KOL win rate but no scout score, so Solana's min_scout_tier / min_n_touches are NOT offered rather than shipped as filters that silently match nothing. You can also filter by a single kol address, min_first_buy_eth and a market-cap band; unknown filter keys are REJECTED, not ignored. On update, filters is a WHOLE-OBJECT replace, not a merge — send the complete set you want. The quota is PER CHAIN and subscription ids are UUIDs. ULTRA+.",
  examples: [
    [{ input: { op: "list" }, output: { status: "success" }, explanation: "List your RHC first-touch subscriptions" }],
    [
      {
        input: { op: "create", name: "high win-rate swings", filters: { min_kol_winrate: 0.55, strategy: "swing", min_first_buy_eth: 0.1 }, delivery_mode: "websocket" },
        output: { status: "success" },
        explanation: "Push only first touches from swing-trading KOLs with a 55%+ win rate",
      },
    ],
    [{ input: { op: "delete", id: "0f9c2b1a-4d3e-4a5b-8c7d-1e2f3a4b5c6d" }, output: { status: "success" }, explanation: "Delete a subscription by UUID" }],
  ],
  schema: z.object({
    op: z.enum(["list", "get", "create", "update", "delete"]).default("list").describe("What to do. Defaults to listing your subscriptions."),
    id: z.string().uuid().optional().describe("Subscription id (UUID) — required for get, update and delete"),
    name: z.string().min(1).max(64).nullable().optional().describe("Human label for the subscription"),
    filters: filtersSchema.optional().describe("Match filters. Whole-object REPLACE on update, not a merge."),
    delivery_mode: z.enum(["websocket", "webhook", "both"]).optional().describe("Where the push goes (default websocket)"),
    webhook_url: z.string().url().nullable().optional().describe("HTTPS webhook URL — required unless delivery_mode is websocket"),
    is_active: z.boolean().optional().describe("Pause (false) or resume (true) the subscription"),
  }),
  handler: async (
    agent: unknown,
    input: {
      op?: "list" | "get" | "create" | "update" | "delete";
      id?: string;
      name?: string | null;
      filters?: z.infer<typeof filtersSchema>;
      delivery_mode?: "websocket" | "webhook" | "both";
      webhook_url?: string | null;
      is_active?: boolean;
    },
  ) => {
    const { op = "list", id, ...rest } = input;
    try {
      if (op === "list") return { status: "success", result: await firstTouchSubscriptions(agent) };

      if (op === "create") {
        return {
          status: "success",
          result: await createFirstTouchSubscription(agent, {
            ...rest,
            name: rest.name ?? undefined,
            webhook_url: rest.webhook_url ?? undefined,
          }),
        };
      }

      if (id === undefined) return { status: "error", message: `${op} requires a subscription id (UUID)` };
      if (op === "get") return { status: "success", result: await firstTouchSubscription(agent, { id }) };
      if (op === "delete") return { status: "success", result: await deleteFirstTouchSubscription(agent, { id }) };
      return { status: "success", result: await updateFirstTouchSubscription(agent, { id, ...rest }) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
