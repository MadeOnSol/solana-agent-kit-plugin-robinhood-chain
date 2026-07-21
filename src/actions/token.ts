import { z } from "zod";
import { token } from "../tools/index.js";

export const tokenAction = {
  name: "RHC_TOKEN_ACTION",
  similes: ["robinhood chain token info", "rhc token snapshot", "token details on robinhood chain", "look up robinhood chain token"],
  description:
    "Get the full snapshot for one Robinhood Chain token by 0x address: metadata, live price/MC/FDV, peak MC + drawdown, graduation status, deployer reputation block (+ other tokens by the same deployer), KOL activity summary, and pool inventory. BASIC+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Full RHC token snapshot" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Token address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await token(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
