import { z } from "zod";
import { recentBonds } from "../tools/index.js";

export const recentBondsAction = {
  name: "RHC_RECENT_BONDS_ACTION",
  similes: ["robinhood chain recent graduations", "rhc recent bonds", "what just graduated on robinhood chain", "rhc tokens that hit 40k"],
  description:
    "Get recent graduations on Robinhood Chain, newest peak first. On RHC a 'graduation' is the $40,000 peak market-cap milestone, NOT a bonding-curve completion — noxa/pons/clanker launch direct-to-DEX with no curve — so the set is defined purely by peak MC. Each row carries symbol, name, launchpad, deployer_address + deployer_tier, live MC, peak MC and peak_mc_at. Filter by deployer_tier, or raise the floor with min_peak (it can only raise the $40K bar, never lower it). BASIC+.",
  examples: [
    [{ input: { deployer_tier: "good", limit: 50 }, output: { status: "success" }, explanation: "Recent RHC graduations from good-tier deployers" }],
  ],
  schema: z.object({
    deployer_tier: z.enum(["elite", "good", "neutral", "spammer"]).optional().describe("Filter to one deployer reputation tier"),
    min_peak: z.number().min(0).optional().describe("Raise the peak-MC floor above $40,000 (values below are ignored)"),
    limit: z.number().min(1).max(200).default(50).describe("Tokens to return (1-200)"),
  }),
  handler: async (agent: unknown, input: { deployer_tier?: "elite" | "good" | "neutral" | "spammer"; min_peak?: number; limit?: number }) => {
    try {
      return { status: "success", result: await recentBonds(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
