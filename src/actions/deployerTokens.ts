import { z } from "zod";
import { deployerTokens } from "../tools/index.js";

export const deployerTokensAction = {
  name: "RHC_DEPLOYER_TOKENS_ACTION",
  similes: ["robinhood chain deployer tokens", "all tokens by this rhc deployer", "rhc deployer launch list", "what has this robinhood chain deployer launched"],
  description:
    "List every token one Robinhood Chain deployer has launched — the paginated launch history (limit 1-100, offset up to 10000), each enriched with live MC, peak MC + peak time, liquidity, launchpad and graduation status. Distinct from the deployer profile, which caps recent tokens at 50. sort=first_seen_at (default) orders globally in Postgres; sort=peak_mc_usd re-orders the FETCHED PAGE only and the response echoes sort_scope:'page' — it is NOT a global top-tokens-by-peak-MC ranking. Unknown wallets return is_deployer:false. BASIC+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678", limit: 50, sort: "first_seen_at" }, output: { status: "success" }, explanation: "One RHC deployer's 50 most recent launches" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Deployer EVM wallet address (0x, 40 hex)"),
    limit: z.number().min(1).max(100).default(50).describe("Page size (1-100)"),
    offset: z.number().min(0).max(10000).default(0).describe("Pagination offset"),
    sort: z.enum(["first_seen_at", "peak_mc_usd"]).default("first_seen_at").describe("first_seen_at sorts globally; peak_mc_usd sorts the returned page only"),
  }),
  handler: async (agent: unknown, input: { address: string; limit?: number; offset?: number; sort?: "first_seen_at" | "peak_mc_usd" }) => {
    try {
      return { status: "success", result: await deployerTokens(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
