import { z } from "zod";
import { deployerTrajectory } from "../tools/index.js";

export const deployerTrajectoryAction = {
  name: "RHC_DEPLOYER_TRAJECTORY_ACTION",
  similes: ["robinhood chain deployer trajectory", "rhc deployer getting better or worse", "is this rhc deployer improving", "rhc deployer skill curve"],
  description:
    "Get a Robinhood Chain deployer's skill curve over time — is this deployer improving or declining? Returns current_streak, longest hit/miss streaks, a 10-token rolling success rate, an improving/declining/stable trend, avg_days_between_deploys, and avg_recovery_tokens (launches burned between a miss and the next hit). The per-token success event is the $40K peak-MC GRADUATION, not a bonding curve — RHC launchpads are direct-to-DEX — and success_metric says so. Capped at 500 tokens (truncated flags a partial curve). Unknown wallets return is_deployer:false, not a 404. BASIC+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Is this RHC deployer improving or declining?" }],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Deployer EVM wallet address (0x, 40 hex)"),
  }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await deployerTrajectory(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
