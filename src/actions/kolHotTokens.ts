import { z } from "zod";
import { kolHotTokens } from "../tools/index.js";

export const kolHotTokensAction = {
  name: "RHC_KOL_HOT_TOKENS_ACTION",
  similes: ["robinhood chain hot tokens", "rhc consensus tokens", "what tokens are kols buying on robinhood chain", "rhc multi kol tokens"],
  description:
    "Get consensus tokens on Robinhood Chain — tokens bought by 2+ distinct tracked KOLs inside a rolling window (5m/15m/1h/6h/24h), ranked by KOL-buyer count then buy volume, enriched with launchpad, deployer tier, graduation and MC. BASIC+.",
  examples: [
    [{ input: { window: "1h" }, output: { status: "success" }, explanation: "Tokens 2+ RHC KOLs bought in the last hour" }],
  ],
  schema: z.object({
    window: z.enum(["5m", "15m", "1h", "6h", "24h"]).default("1h").describe("Rolling consensus window"),
  }),
  handler: async (agent: unknown, input: { window?: "5m" | "15m" | "1h" | "6h" | "24h" }) => {
    try {
      return { status: "success", result: await kolHotTokens(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
