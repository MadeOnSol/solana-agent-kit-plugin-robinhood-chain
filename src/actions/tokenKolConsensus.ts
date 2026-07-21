import { z } from "zod";
import { tokenKolConsensus } from "../tools/index.js";

export const tokenKolConsensusAction = {
  name: "RHC_KOL_CONSENSUS_ACTION",
  similes: ["robinhood chain kol consensus", "rhc kol positioning", "are kols accumulating on robinhood chain", "kol net flow eth"],
  description:
    "Get how the tracked-KOL cohort is positioned on a Robinhood Chain token: distinct KOL buyers vs sellers, exit rate (bought AND sold), net_flow_eth, median entry MC, and first-touch wallet/time. ULTRA additionally returns the buyers and exited wallet lists. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "KOL consensus on one RHC token" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Token address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await tokenKolConsensus(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
