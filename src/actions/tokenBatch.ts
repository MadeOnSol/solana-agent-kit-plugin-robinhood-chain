import { z } from "zod";
import { tokenBatch } from "../tools/index.js";

export const tokenBatchAction = {
  name: "RHC_TOKEN_BATCH_ACTION",
  similes: ["robinhood chain token batch", "look up several rhc tokens at once", "rhc bulk token lookup", "batch price these robinhood chain tokens"],
  description:
    "Look up up to 50 Robinhood Chain tokens in ONE request — symbol/name/decimals, launchpad, graduation status, live price, market cap, FDV, liquidity, peak MC + peak time, primary DEX, last trade time, and the deployer reputation block. Set-based server-side (three queries total regardless of batch size), not a fan-out, and it counts as a single request against your rate limit. Every REQUESTED address is echoed back — unknown ones as found:false — so the array stays positional. Buyer-quality is deliberately NOT bundled here; use the batch buyer-quality tool for that. BASIC+.",
  examples: [
    [{ input: { addresses: ["0x1234567890abcdef1234567890abcdef12345678", "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"] }, output: { status: "success" }, explanation: "Two RHC tokens priced in one call" }],
  ],
  schema: z.object({
    addresses: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).min(1).max(50).describe("1-50 Robinhood Chain token addresses (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { addresses: string[] }) => {
    try {
      return { status: "success", result: await tokenBatch(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
