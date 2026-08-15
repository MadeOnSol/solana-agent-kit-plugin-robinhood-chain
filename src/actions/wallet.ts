import { z } from "zod";
import {
  wallet,
  walletPnl,
  walletPositions,
  walletTrades,
} from "../tools/index.js";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const addressSchema = z
  .string()
  .regex(EVM_ADDRESS, "Must be a 0x-prefixed 40-hex EVM address")
  .describe("Wallet EVM address (0x, 40 hex). Case-insensitive — lowercased server-side");

export const walletAction = {
  name: "RHC_WALLET_ACTION",
  similes: [
    "robinhood chain wallet profile",
    "rhc wallet",
    "look up a wallet on robinhood chain",
    "rhc wallet stats",
    "who is this robinhood chain wallet",
  ],
  description:
    "Any Robinhood Chain wallet's 90-day trading profile: ETH-denominated FIFO cost-basis PnL, per-token breakdown, recent trades, and a reputation block (is_kol, is_deployer + deployer_tier, is_alpha_tracked, dump-cluster membership, early_buyer_tokens). IMPORTANT: stats.unattributed_trades counts pre-2026-07-18 rows whose trader_eoa is NULL — unattributable by design and excluded from every PnL figure, so a low analyzed_trades on an old wallet is a data-window limit, not inactivity. stats_unavailable=true means the snapshot timed out and only the flags are reliable. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "90-day RHC profile for one wallet" }],
  ],
  schema: z.object({ address: addressSchema }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await wallet(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletPnlAction = {
  name: "RHC_WALLET_PNL_ACTION",
  similes: [
    "robinhood chain wallet pnl",
    "rhc wallet profit and loss",
    "how much has this rhc wallet made",
    "rhc pnl breakdown",
    "robinhood chain wallet performance",
  ],
  description:
    "Full FIFO cost-basis PnL for one Robinhood Chain wallet over 90 days: realized vs unrealized, a daily realized curve, every closed position with roi_pct and hold_minutes, and open positions marked to the current price. This is the SAME FIFO implementation as the Solana /wallet/{address}/pnl, so the two chains compare directly. IMPORTANT: notes.cost_basis_observable_from is the date the window opens — buys before it are invisible to cost basis, which is why a long-held position can read as a sell with no matching buy. Check notes.partial before quoting totals. Amounts are ETH. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "FIFO PnL with curve and closed positions" }],
  ],
  schema: z.object({ address: addressSchema }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await walletPnl(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletPositionsAction = {
  name: "RHC_WALLET_POSITIONS_ACTION",
  similes: [
    "robinhood chain wallet positions",
    "rhc holdings",
    "what is this rhc wallet holding",
    "rhc open positions",
    "robinhood chain bags",
  ],
  description:
    "Only what a Robinhood Chain wallet still holds, marked to the current price — the same FIFO pass as the PnL action without the curve and closed positions. Use this for 'what is this wallet in right now'. IMPORTANT: positions[].liquidity_basis='v4_virtual_ceiling' means liquidity_usd is a bonding-curve VIRTUAL ceiling, not withdrawable TVL — never size an exit against it; 'measured' means real pool reserves. summary.unpriced_positions are excluded from the value and unrealized totals. Amounts are ETH. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678" }, output: { status: "success" }, explanation: "Open positions marked to market" }],
  ],
  schema: z.object({ address: addressSchema }),
  handler: async (agent: unknown, input: { address: string }) => {
    try {
      return { status: "success", result: await walletPositions(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};

export const walletTradesAction = {
  name: "RHC_WALLET_TRADES_ACTION",
  similes: [
    "robinhood chain wallet trades",
    "rhc wallet tape",
    "what has this rhc wallet been trading",
    "rhc wallet swap history",
    "recent trades by a robinhood chain wallet",
  ],
  description:
    "One Robinhood Chain wallet's swaps, newest first, cursor-paginated on an opaque next_before keyset. Distinct from the global trades action with a token filter: that filters the GLOBAL tape by TOKEN, this filters by WALLET (a different index path). Pass the previous response's next_before back as `before` to page — it is an opaque cursor, not an offset. PRO+.",
  examples: [
    [{ input: { address: "0x1234567890abcdef1234567890abcdef12345678", limit: 50, action: "buy" }, output: { status: "success" }, explanation: "That wallet's 50 most recent buys" }],
  ],
  schema: z.object({
    address: addressSchema,
    limit: z.number().min(1).max(200).default(50).describe("Page size (1–200, default 50)"),
    before: z.string().optional().describe("Opaque keyset cursor — the previous response's next_before"),
    since: z.string().optional().describe("ISO-8601 timestamp with offset; only trades newer than this"),
    action: z.enum(["buy", "sell"]).optional().describe("Restrict to one side"),
    token: z.string().optional().describe("Restrict to one token address (0x, 40 hex)"),
  }),
  handler: async (
    agent: unknown,
    input: {
      address: string;
      limit?: number;
      before?: string;
      since?: string;
      action?: "buy" | "sell";
      token?: string;
    },
  ) => {
    try {
      return { status: "success", result: await walletTrades(agent, input) };
    } catch (err) {
      return { status: "error", message: (err as Error).message };
    }
  },
};
