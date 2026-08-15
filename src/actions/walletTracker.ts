import { z } from "zod";
import {
  walletTrackerList,
  walletTrackerAdd,
  walletTrackerRemove,
  walletTrackerRelabel,
  walletTrackerTrades,
  walletTrackerSummary,
} from "../tools/index.js";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const addressSchema = z
  .string()
  .regex(EVM_ADDRESS, "Must be a 0x-prefixed 40-hex EVM address")
  .describe("Wallet EVM address (0x, 40 hex)");

export const walletTrackerListAction = {
  name: "RHC_WALLET_TRACKER_LIST_ACTION",
  similes: [
    "my robinhood chain watchlist",
    "list tracked rhc wallets",
    "which robinhood chain wallets am i tracking",
    "rhc watchlist",
    "show my tracked rhc wallets",
  ],
  description:
    "List the wallets on your Robinhood Chain watchlist, with count/limit/remaining. Quotas are PER CHAIN — PRO 50 / ULTRA 100 / BUSINESS 500 RHC wallets, independent of your Solana watchlist, so adopting RHC never shrinks an existing Solana list. PRO+.",
  examples: [
    [{ input: {}, output: { status: "success" }, explanation: "Your tracked RHC wallets and remaining slots" }],
  ],
  schema: z.object({}),
  handler: async (agent: unknown) => {
    try {
      return { status: "success", result: await walletTrackerList(agent) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTrackerAddAction = {
  name: "RHC_WALLET_TRACKER_ADD_ACTION",
  similes: [
    "track a robinhood chain wallet",
    "add rhc wallet to watchlist",
    "watch this robinhood chain wallet",
    "follow rhc wallet",
    "start tracking an rhc wallet",
  ],
  description:
    "WRITES — add a wallet to your Robinhood Chain watchlist. This consumes one slot of your per-chain quota. The address is stored lowercase so it matches rhc_trades.trader_eoa; a checksummed 0xAbC… would join to nothing and the wallet would look permanently silent. Returns 409 if already tracked and 403 once you are at your tier cap. Omit `label` to leave it unlabelled — null is rejected here (use the relabel action to clear one). PRO+.",
  examples: [
    [{ input: { wallet_address: "0x1234567890abcdef1234567890abcdef12345678", label: "whale one" }, output: { status: "success" }, explanation: "Track a wallet with a label" }],
  ],
  schema: z.object({
    wallet_address: addressSchema,
    label: z.string().min(1).max(64).optional().describe("Optional human label (1–64 chars). Omit to leave unlabelled"),
  }),
  handler: async (agent: unknown, input: { wallet_address: string; label?: string }) => {
    try {
      return { status: "success", result: await walletTrackerAdd(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTrackerRemoveAction = {
  name: "RHC_WALLET_TRACKER_REMOVE_ACTION",
  similes: [
    "untrack a robinhood chain wallet",
    "remove rhc wallet from watchlist",
    "stop tracking rhc wallet",
    "unfollow robinhood chain wallet",
    "delete rhc watchlist entry",
  ],
  description:
    "DESTRUCTIVE — permanently remove a wallet from your Robinhood Chain watchlist, freeing one slot against your per-chain quota. Returns 404 if the wallet is not on your list. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Untrack a wallet" }],
  ],
  schema: z.object({ address: addressSchema }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await walletTrackerRemove(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTrackerRelabelAction = {
  name: "RHC_WALLET_TRACKER_RELABEL_ACTION",
  similes: [
    "relabel a tracked robinhood chain wallet",
    "rename rhc watchlist entry",
    "change the label on an rhc wallet",
    "clear the label on a tracked rhc wallet",
    "set rhc watchlist label",
  ],
  description:
    "WRITES — change the label on a tracked Robinhood Chain wallet. Pass label=null to clear it (null IS accepted here, unlike on add). Returns 404 if the wallet is not on your watchlist. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678", label: "renamed whale" }, output: { status: "success" }, explanation: "Rename a tracked wallet" }],
  ],
  schema: z.object({
    address: addressSchema,
    label: z.string().min(1).max(64).nullable().describe("New label (1–64 chars), or null to clear it"),
  }),
  handler: async (agent: unknown, input: { address: string; label: string | null }) => {
    try {
      return { status: "success", result: await walletTrackerRelabel(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTrackerTradesAction = {
  name: "RHC_WALLET_TRACKER_TRADES_ACTION",
  similes: [
    "trades from my tracked robinhood chain wallets",
    "rhc watchlist activity",
    "what are my tracked rhc wallets doing",
    "robinhood chain watchlist feed",
    "merged rhc tracked wallet trades",
  ],
  description:
    "Merged trade feed across every wallet on your Robinhood Chain watchlist, newest first, each row labelled with its watchlist label. The cursor (next_before) is an opaque keyset matching the rest of the RHC tree, NOT the Solana tracker's integer epoch. A `wallet` filter must already be on your watchlist or the call returns 400. PRO+.",
  examples: [
    [{ input: { limit: 50, action: "buy" }, output: { status: "success" }, explanation: "Recent buys across all tracked RHC wallets" }],
  ],
  schema: z.object({
    limit: z.number().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
    before: z.string().optional().describe("Opaque keyset cursor — the previous response's next_before"),
    wallet: z.string().optional().describe("Restrict to one tracked wallet (must already be on the watchlist)"),
    action: z.enum(["buy", "sell"]).optional().describe("Restrict to one side"),
    token: z.string().optional().describe("Restrict to one token address (0x, 40 hex)"),
  }),
  handler: async (
    agent: unknown,
    input: { limit?: number; before?: string; wallet?: string; action?: "buy" | "sell"; token?: string },
  ) => {
    try {
      return { status: "success", result: await walletTrackerTrades(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTrackerSummaryAction = {
  name: "RHC_WALLET_TRACKER_SUMMARY_ACTION",
  similes: [
    "summary of my tracked robinhood chain wallets",
    "rhc watchlist rollup",
    "how are my tracked rhc wallets performing",
    "robinhood chain watchlist volume",
    "per-wallet rhc stats",
  ],
  description:
    "Per-wallet buy/sell/volume rollup across your tracked Robinhood Chain wallets. Sourced from rhc_trades DIRECTLY, not from a per-subscriber capture log — on RHC every swap is already recorded, so adding a wallet gives you its full history immediately rather than only from the moment you started tracking it (the Solana tracker cannot do this). stats_unavailable=true means the rollup timed out and the per-wallet stats are zeroed, not absent. PRO+.",
  examples: [
    [{ input: { period: "30d" }, output: { status: "success" }, explanation: "30-day rollup across the watchlist" }],
  ],
  schema: z.object({
    period: z.string().default("7d").describe("Lookback window, e.g. '24h', '7d', '30d' (default '7d')"),
    wallet: z.string().optional().describe("Restrict the rollup to one tracked wallet"),
  }),
  handler: async (agent: unknown, input: { period?: string; wallet?: string }) => {
    try {
      return { status: "success", result: await walletTrackerSummary(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
