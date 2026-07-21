import { z } from "zod";
import { kolLeaderboard } from "../tools/index.js";

export const kolLeaderboardAction = {
  name: "RHC_KOL_LEADERBOARD_ACTION",
  similes: ["robinhood chain kol leaderboard", "rhc top kols", "rhc kol rankings", "most active kols on robinhood chain"],
  description:
    "Get the KOL activity leaderboard on Robinhood Chain — KOLs ranked by trade count then net ETH flow (buy_eth − sell_eth) over a 24h/7d/30d window. EVM-native. BASIC+.",
  examples: [
    [{ input: { period: "7d", limit: 20 }, output: { status: "success" }, explanation: "Top 20 RHC KOLs over 7 days" }],
  ],
  schema: z.object({
    period: z.enum(["24h", "7d", "30d"]).default("24h").describe("Rolling window"),
    limit: z.number().min(1).max(100).default(50).describe("Rows to return"),
  }),
  handler: async (agent: unknown, input: { period?: "24h" | "7d" | "30d"; limit?: number }) => {
    try {
      return { status: "success", result: await kolLeaderboard(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
