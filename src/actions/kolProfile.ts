import { z } from "zod";
import { kolProfile } from "../tools/index.js";

export const kolProfileAction = {
  name: "RHC_KOL_PROFILE_ACTION",
  similes: ["robinhood chain kol profile", "rhc kol stats", "single kol on robinhood chain", "kol wallet stats rhc"],
  description:
    "Get a single KOL's profile on Robinhood Chain by EVM wallet (0x, 40 hex): aggregate stats over their last 200 RHC trades (trades, buys, sells, buy/sell/net ETH, tokens traded) plus their 50 most recent trades. BASIC+.",
  examples: [
    [{ input: { wallet: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "One KOL's RHC profile" }],
  ],
  schema: z.object({
    wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("KOL EVM wallet address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { wallet: string }) => {
    try {
      return { status: "success", result: await kolProfile(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
