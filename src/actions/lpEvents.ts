import { z } from "zod";
import { lpEvents } from "../tools/index.js";

export const lpEventsAction = {
  name: "RHC_LP_EVENTS_ACTION",
  similes: ["robinhood chain liquidity removals", "rhc lp events", "rhc rug pulls", "liquidity pulled on robinhood chain", "who removed liquidity on rhc"],
  description:
    "Get the Robinhood Chain liquidity REMOVALS feed — the rug signal. Every Uniswap v2/v3 Burn and v4 ModifyLiquidity with a negative delta on tracked pools, decoded from our own node's log subscription. Removals ONLY: liquidity adds are not persisted (the response's coverage block says adds_persisted:false), so an empty page means 'no removals seen', never 'no liquidity activity'. Amounts are raw uint256 STRINGS (liquidity, amount0, amount1, token_amount_raw, quote_amount_raw) — never coerce to float; v4 rows carry liquidity only. provider is the wallet that pulled; provider_is_token_deployer=true is the classic rug shape. Filter by token / pool (v2/v3 address or v4 bytes32 poolId) / provider / dex; cursor via next_before. Data since 2026-08-05. PRO+.",
  examples: [
    [{ input: { token: "0x1234567890abcdef1234567890abcdef12345678", limit: 50 }, output: { status: "success" }, explanation: "Latest 50 liquidity removals for one RHC token" }],
    [{ input: { dex: "uniswap-v4", limit: 100 }, output: { status: "success" }, explanation: "Chain-wide v4 liquidity removals" }],
  ],
  schema: z.object({
    limit: z.number().int().min(1).max(200).default(50).describe("Rows to return (1-200)"),
    token: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().describe("Filter to one token address"),
    pool: z.string().optional().describe("Pool address (v2/v3) or bytes32 poolId (v4)"),
    provider: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().describe("Filter to one liquidity provider — the wallet that pulled"),
    dex: z.enum(["uniswap-v2", "uniswap-v3", "uniswap-v4"]).optional().describe("Filter by DEX version"),
    before: z.string().optional().describe("Opaque cursor from a previous response's next_before"),
  }),
  handler: async (agent: unknown, input: { limit?: number; token?: string; pool?: string; provider?: string; dex?: "uniswap-v2" | "uniswap-v3" | "uniswap-v4"; before?: string }) => {
    try {
      return { status: "success", result: await lpEvents(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
