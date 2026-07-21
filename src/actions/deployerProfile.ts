import { z } from "zod";
import { deployerProfile } from "../tools/index.js";

export const deployerProfileAction = {
  name: "RHC_DEPLOYER_PROFILE_ACTION",
  similes: ["robinhood chain deployer profile", "rhc deployer stats", "is this a deployer on robinhood chain", "deployer reputation robinhood chain"],
  description:
    "Get one Robinhood Chain deployer's full reputation row (tier, bonding_rate, runner_rate, best peak MC, launchpads, deploy timeline) plus their 50 most recent tokens with live MC and peak MC. Unknown wallets return is_deployer:false (not a 404). BASIC+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "One RHC deployer's reputation profile" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Deployer EVM wallet address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await deployerProfile(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
