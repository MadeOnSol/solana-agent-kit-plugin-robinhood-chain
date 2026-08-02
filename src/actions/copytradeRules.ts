import { z } from "zod";
import {
  copytradeRules,
  copytradeRule,
  createCopytradeRule,
  updateCopytradeRule,
  deleteCopytradeRule,
} from "../tools/index.js";

const EVM = /^0x[0-9a-fA-F]{40}$/;

export const copytradeRulesAction = {
  name: "RHC_COPYTRADE_RULES_ACTION",
  similes: [
    "robinhood chain copy trade rules",
    "rhc copytrade subscriptions",
    "create an rhc copy trade rule",
    "pause my robinhood chain copy trade rule",
    "delete rhc copytrade rule",
  ],
  description:
    "Manage Robinhood Chain copy-trade rules — list, get, create, update or delete. A rule watches up to 250 source EVM wallets and pushes a signal (webhook and/or WebSocket) when one of them trades. It is DATA, never execution: the delivered suggested_eth_amount is a sizing suggestion and no order is ever placed on your behalf. Amounts are ETH (min_trade_eth, sizing_amount), not SOL. Unlike the Solana copy-trade engine there is NO market-cap band on RHC — the producer's event carries no market cap, so it is omitted rather than shipped as a filter that silently never matches. Rule count and source-wallet caps are PER CHAIN, so Solana rules do not consume RHC capacity. webhook_url is required on create unless delivery_mode is websocket, and the returned webhook_secret is shown ONCE. PRO+.",
  examples: [
    [{ input: { op: "list" }, output: { status: "success" }, explanation: "List your RHC copy-trade rules" }],
    [
      {
        input: {
          op: "create",
          source_wallets: ["0x1234567890abcdef1234567890abcdef12345678"],
          sizing_mode: "proportional",
          sizing_amount: 0.25,
          min_trade_eth: 0.05,
          delivery_mode: "webhook",
          webhook_url: "https://example.com/rhc-copytrade",
        },
        output: { status: "success" },
        explanation: "Mirror one wallet's buys at 25% of its size, ignoring trades under 0.05 ETH",
      },
    ],
    [{ input: { op: "update", id: 12, is_active: false }, output: { status: "success" }, explanation: "Pause rule 12" }],
  ],
  schema: z.object({
    op: z.enum(["list", "get", "create", "update", "delete"]).default("list").describe("What to do. Defaults to listing your rules."),
    id: z.number().int().positive().optional().describe("Numeric rule id — required for get, update and delete"),
    name: z.string().min(1).max(64).nullable().optional().describe("Human label for the rule"),
    source_wallets: z.array(z.string().regex(EVM)).min(1).max(250).optional().describe("EVM wallets to mirror (0x, 40 hex) — lowercased on write; the per-tier cap is enforced server-side. Required on create."),
    min_trade_eth: z.number().min(0).optional().describe("Ignore source trades smaller than this, in ETH"),
    only_action: z.enum(["buy", "sell", "both"]).optional().describe("Which side to mirror (default buy)"),
    sizing_mode: z.enum(["fixed", "proportional", "percent_source"]).optional().describe("How suggested_eth_amount is computed (default fixed)"),
    sizing_amount: z.number().positive().optional().describe("Sizing input in ETH, or the percentage for percent_source. Required on create."),
    delivery_mode: z.enum(["webhook", "websocket", "both"]).optional().describe("Where signals go (default webhook)"),
    webhook_url: z.string().url().nullable().optional().describe("HTTPS webhook URL — required unless delivery_mode is websocket"),
    is_active: z.boolean().optional().describe("Pause (false) or resume (true) the rule"),
  }),
  handler: async (
    agent: unknown,
    input: {
      op?: "list" | "get" | "create" | "update" | "delete";
      id?: number;
      name?: string | null;
      source_wallets?: string[];
      min_trade_eth?: number;
      only_action?: "buy" | "sell" | "both";
      sizing_mode?: "fixed" | "proportional" | "percent_source";
      sizing_amount?: number;
      delivery_mode?: "webhook" | "websocket" | "both";
      webhook_url?: string | null;
      is_active?: boolean;
    },
  ) => {
    const { op = "list", id, ...rest } = input;
    try {
      if (op === "list") return { status: "success", result: await copytradeRules(agent) };

      if (op === "create") {
        if (!rest.source_wallets?.length || rest.sizing_amount === undefined) {
          return { status: "error", message: "create requires source_wallets and sizing_amount" };
        }
        return {
          status: "success",
          result: await createCopytradeRule(agent, {
            ...rest,
            name: rest.name ?? undefined,
            webhook_url: rest.webhook_url ?? undefined,
            source_wallets: rest.source_wallets,
            sizing_amount: rest.sizing_amount,
          }),
        };
      }

      if (id === undefined) return { status: "error", message: `${op} requires a numeric rule id` };
      if (op === "get") return { status: "success", result: await copytradeRule(agent, { id }) };
      if (op === "delete") return { status: "success", result: await deleteCopytradeRule(agent, { id }) };
      return { status: "success", result: await updateCopytradeRule(agent, { id, ...rest }) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
