import { z } from "zod";
import { alphaWallets } from "../tools/index.js";

export const alphaWalletsAction = {
  name: "RHC_ALPHA_WALLETS_ACTION",
  similes: ["robinhood chain alpha wallets", "rhc smart money", "best traders on robinhood chain", "rhc wallet ranking", "smart money wallets robinhood chain"],
  description:
    "Rank Robinhood Chain trader wallets by realized on-chain performance (smart-money discovery). net_eth is realized net flow (sell − buy); win_rate is the share of tokens taken out profitably; likely_bot flags arb/MM fleets. Filter by classification (human/bot/smart_money), identity (known_kol/unknown), memecoin_share, and more. PRO+.",
  examples: [
    [{ input: { classification: "smart_money", min_memecoin_share: 0.7, limit: 25 }, output: { status: "success" }, explanation: "Top RHC smart-money memecoin traders" }],
  ],
  schema: z.object({
    classification: z.enum(["all", "human", "bot", "smart_money"]).default("all").describe("human = not likely_bot; smart_money = human + net_eth ≥ 2 + win_rate ≥ 0.45"),
    identity: z.enum(["all", "known_kol", "unknown"]).default("all").describe("known_kol = mapped to a tracked Solana KOL; unknown = net-new RHC smart money"),
    min_memecoin_share: z.number().min(0).max(1).optional().describe("Minimum launchpad-memecoin trade share (0.7 ≈ mostly-memecoin)"),
    max_avg_mc_usd: z.number().optional().describe("Maximum average market cap traded (low-cap filter)"),
    min_net_eth: z.number().optional().describe("Minimum realized net ETH"),
    min_win_rate: z.number().min(0).max(1).optional().describe("Minimum win rate (0–1)"),
    max_win_rate: z.number().min(0).max(1).optional().describe("Maximum win rate (0–1)"),
    min_trades: z.number().min(0).optional().describe("Minimum trades"),
    min_tokens: z.number().min(0).optional().describe("Minimum distinct tokens traded"),
    min_buy_eth: z.number().optional().describe("Minimum ETH deployed (whale/size filter)"),
    active_hours: z.number().min(1).max(720).optional().describe("Only wallets that traded within the last N hours"),
    sort: z.enum(["net_eth", "win_rate", "trades", "tokens", "buy_eth", "memecoin_share", "last_trade_at"]).default("net_eth").describe("Ordering"),
    order: z.enum(["desc", "asc"]).default("desc").describe("Sort direction"),
    limit: z.number().min(1).max(100).default(25).describe("Rows to return"),
    offset: z.number().min(0).max(10000).default(0).describe("Pagination offset"),
  }),
  handler: async (
    agent: unknown,
    input: {
      classification?: "all" | "human" | "bot" | "smart_money";
      identity?: "all" | "known_kol" | "unknown";
      min_memecoin_share?: number;
      max_avg_mc_usd?: number;
      min_net_eth?: number;
      min_win_rate?: number;
      max_win_rate?: number;
      min_trades?: number;
      min_tokens?: number;
      min_buy_eth?: number;
      active_hours?: number;
      sort?: "net_eth" | "win_rate" | "trades" | "tokens" | "buy_eth" | "memecoin_share" | "last_trade_at";
      order?: "desc" | "asc";
      limit?: number;
      offset?: number;
    },
  ) => {
    try {
      return { status: "success", result: await alphaWallets(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
