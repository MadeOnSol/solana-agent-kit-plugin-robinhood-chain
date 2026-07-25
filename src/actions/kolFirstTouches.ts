import { z } from "zod";
import { kolFirstTouches } from "../tools/index.js";

export const kolFirstTouchesAction = {
  name: "RHC_KOL_FIRST_TOUCHES_ACTION",
  similes: ["robinhood chain kol first touches", "rhc first kol buy", "who discovered this rhc token first", "earliest kol entries robinhood chain"],
  description:
    "Get KOL first touches on Robinhood Chain — the GLOBALLY earliest buy by ANY tracked KOL per token (the discovery / early-entry signal), newest first. Each event carries eth_amount, tx_hash, token_age_minutes at the touch, MC + price at the first buy, current and peak MC, and the first_kol block. Cursor back with next_before. BASIC+, but limit is clamped to 20 below PRO and first_kol.evm_address is returned only on ULTRA/BUSINESS (name + twitter_url always).",
  examples: [
    [{ input: { limit: 50, token_age_max_min: 60 }, output: { status: "success" }, explanation: "First KOL touches on RHC tokens under an hour old" }],
  ],
  schema: z.object({
    limit: z.number().min(1).max(100).default(50).describe("Number of events (1-100; clamped to 20 on BASIC)"),
    since: z.string().optional().describe("Only first touches strictly newer than this (ISO 8601 with offset)"),
    before: z.string().optional().describe("Cursor — only first touches strictly older than this (ISO 8601 with offset). Pass next_before to page back."),
    min_eth: z.number().min(0).max(100000).optional().describe("Minimum size of the first buy in ETH"),
    token_age_max_min: z.number().min(1).max(43200).optional().describe("Only tokens younger than N minutes at the time of the first touch"),
    launchpad: z.string().optional().describe("Filter by launchpad: pons, flap, clanker, hood.fun, noxa, virtuals"),
    min_mc_usd: z.number().min(0).optional().describe("Minimum market cap at the first buy"),
    max_mc_usd: z.number().min(0).optional().describe("Maximum market cap at the first buy — must be >= min_mc_usd"),
  }),
  handler: async (
    agent: unknown,
    input: { limit?: number; since?: string; before?: string; min_eth?: number; token_age_max_min?: number; launchpad?: string; min_mc_usd?: number; max_mc_usd?: number },
  ) => {
    try {
      return { status: "success", result: await kolFirstTouches(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
