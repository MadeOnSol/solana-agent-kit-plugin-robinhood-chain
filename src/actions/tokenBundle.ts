import { z } from "zod";
import { tokenBundle } from "../tools/index.js";

export const tokenBundleAction = {
  name: "RHC_TOKEN_BUNDLE_ACTION",
  similes: ["robinhood chain bundle", "rhc launch bundle", "same block buyers on robinhood chain", "rhc bundle held percent", "insider cohort robinhood chain"],
  description:
    "Detect a coordinated launch bundle in a Robinhood Chain token's earliest-buyer cohort and measure how much it still holds. Robinhood Chain is an Arbitrum Orbit L2 with no atomic multi-signer tx, so bundle_kind is `same_block` (3+ first buys in one block) or `none`. Returns held_ratio, held_pct_of_supply, fully_exited. BASIC=scalar signal; PRO=top-10 wallets; ULTRA=full cohort + identity.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Same-block launch-bundle detection for one RHC token" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Token address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await tokenBundle(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
