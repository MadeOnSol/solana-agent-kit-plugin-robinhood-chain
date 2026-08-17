/**
 * Robinhood Chain toolset for Solana Agent Kit.
 *
 * "Solana Agent Kit" is SVM-branded, but the intel here is EVM-native and lives
 * on **Robinhood Chain (chain id 4663)** — this is an RHC toolset packaged in the
 * SAK plugin shape so agent builders already on SAK can add Robinhood Chain
 * coverage without a new framework. Every endpoint is in the /api/v1/rhc
 * namespace and returns EVM fields (token_address/0x, eth_amount, tx_hash,
 * `block_number`, `net_flow_eth`).
 *
 * Auth is a single MadeOnSol API key (`msk_`, Bearer) — the SAME key that covers
 * the Solana API, bundled into every tier at no extra cost. Get a free key at
 * https://madeonsol.com/pricing. The x402 pay-per-call rail is live on Robinhood Chain too
 * and is NOT available on Robinhood Chain — key auth only.
 */

import { VERSION } from "../version.js";

const BASE_URL = "https://madeonsol.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Agent = any; // SolanaAgentKit — `any` to avoid a hard dependency on the peer

let _authHeaders: Record<string, string> | null = null;

export interface RateLimitInfo {
  limit?: string;
  remaining?: string;
  reset?: string;
  requestId?: string;
}

/** Most recent rate-limit headers, populated by every successful API request. */
export let lastRateLimit: RateLimitInfo = {};

function captureRateLimit(res: Response) {
  lastRateLimit = {
    limit: res.headers.get("X-RateLimit-Limit") ?? undefined,
    remaining: res.headers.get("X-RateLimit-Remaining") ?? undefined,
    reset: res.headers.get("X-RateLimit-Reset") ?? undefined,
    requestId: res.headers.get("X-Request-Id") ?? undefined,
  };
}

function getConfig(agent: Agent, key: string): string | undefined {
  return agent?.config?.[key] || agent?.config?.OTHER_API_KEYS?.[key];
}

export function initAuth(agent: Agent): void {
  if (_authHeaders) return;
  const apiKey = getConfig(agent, "ROBINHOOD_CHAIN_API_KEY") || getConfig(agent, "MADEONSOL_API_KEY");
  if (apiKey) {
    _authHeaders = {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": `solana-agent-kit-plugin-robinhood-chain/${VERSION}`,
    };
    console.log("[robinhood-chain] Using MadeOnSol API key (Bearer auth)");
  } else {
    _authHeaders = {};
    console.warn(
      "\n[robinhood-chain] No API key configured — every Robinhood Chain call will fail.\n" +
        "  → Get a free `msk_` key (covers Robinhood Chain at no extra cost) at https://madeonsol.com/pricing\n" +
        "  → Set ROBINHOOD_CHAIN_API_KEY (or MADEONSOL_API_KEY) in the agent config.\n",
    );
  }
}

/**
 * Request against `/api/v1{path}` with Bearer auth. `path` starts with `/rhc/...`.
 *
 * GET sends `params` as the query string; every other method (the batch POSTs and
 * the rule-engine POST/PATCH routes) sends the SAME object as a JSON body, so a
 * tool signature reads identically either way. Values are `unknown` because rule
 * bodies carry nulls and nested objects that a query string never would.
 */
async function restQuery(
  agent: Agent,
  method: string,
  path: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  initAuth(agent);
  if (!_authHeaders || !_authHeaders.Authorization) {
    throw new Error(
      "MadeOnSol API key required for Robinhood Chain. Get a free `msk_` key at https://madeonsol.com/pricing",
    );
  }
  const url = new URL(`/api/v1${path}`, BASE_URL);
  const isWrite = method !== "GET";
  if (params && !isWrite) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: isWrite ? { ..._authHeaders, "Content-Type": "application/json" } : _authHeaders,
    ...(isWrite ? { body: JSON.stringify(params ?? {}) } : {}),
  });
  captureRateLimit(res);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Robinhood Chain API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── KOL ──

/** Live RHC KOL trade feed (BASIC+). GET /rhc/kol/feed */
export async function kolFeed(
  agent: Agent,
  params: { limit?: number; before?: string; action?: "buy" | "sell"; kol?: string; min_eth?: number } = {},
) {
  return restQuery(agent, "GET", "/rhc/kol/feed", params);
}

/** RHC KOL activity leaderboard by trade count then net ETH (BASIC+). GET /rhc/kol/leaderboard */
export async function kolLeaderboard(agent: Agent, params: { period?: "24h" | "7d" | "30d"; limit?: number } = {}) {
  return restQuery(agent, "GET", "/rhc/kol/leaderboard", params);
}

/** Consensus tokens bought by 2+ KOLs in the window (BASIC+). GET /rhc/kol/hot-tokens */
export async function kolHotTokens(agent: Agent, params: { window?: "5m" | "15m" | "1h" | "6h" | "24h" } = {}) {
  return restQuery(agent, "GET", "/rhc/kol/hot-tokens", params);
}

/** Single KOL profile by EVM wallet (BASIC+). GET /rhc/kol/{wallet} */
export async function kolProfile(agent: Agent, params: { wallet: string }) {
  return restQuery(agent, "GET", `/rhc/kol/${encodeURIComponent(params.wallet)}`);
}

/**
 * Tokens bought by min_kols+ DISTINCT KOLs in the window — the coordination signal,
 * with net ETH, accumulating/distributing, exited vs holding, and the per-KOL
 * breakdown (BASIC+). GET /rhc/kol/coordination
 */
export async function kolCoordination(
  agent: Agent,
  params: {
    period?: "1h" | "6h" | "24h" | "7d";
    min_kols?: number;
    limit?: number;
    /** MC at the FIRST KOL buy — tokens with unknown MC are dropped when a band is set. */
    min_mc_usd?: number;
    max_mc_usd?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/kol/coordination", params);
}

/**
 * The GLOBALLY earliest buy by ANY tracked KOL per token — the discovery signal
 * (BASIC+; limit clamped to 20 below PRO, first_kol.evm_address ULTRA-only).
 * GET /rhc/kol/first-touches
 */
export async function kolFirstTouches(
  agent: Agent,
  params: {
    limit?: number;
    since?: string;
    before?: string;
    min_eth?: number;
    token_age_max_min?: number;
    launchpad?: string;
    min_mc_usd?: number;
    max_mc_usd?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/kol/first-touches", params);
}

// ── Trades ──

/** RHC DEX trade tape with trader_eoa + MEV fields (PRO+). GET /rhc/trades */
export async function trades(
  agent: Agent,
  params: {
    limit?: number;
    token?: string;
    dex?: "uniswap-v2" | "uniswap-v3" | "uniswap-v4";
    action?: "buy" | "sell";
    min_eth?: number;
    before?: string;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/trades", params);
}

/**
 * Liquidity REMOVALS feed — the rug signal (PRO+). Uniswap v2/v3 Burn + v4
 * ModifyLiquidity with a negative delta on tracked pools, from our own node.
 * Removals ONLY: adds are not persisted (`coverage.adds_persisted === false`),
 * so an empty page means "no removals seen", never "no liquidity activity".
 * Amounts are raw uint256 STRINGS; v4 rows carry `liquidity` only.
 * `provider_is_token_deployer` is the classic rug tell. Cursor via
 * `next_before` (same opaque keyset as trades). Data since 2026-08-05.
 * GET /rhc/lp-events
 */
export async function lpEvents(
  agent: Agent,
  params: {
    limit?: number;
    token?: string;
    pool?: string;
    provider?: string;
    dex?: "uniswap-v2" | "uniswap-v3" | "uniswap-v4";
    before?: string;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/lp-events", params);
}

// ── Tokens ──

/** RHC token discovery, sortable/filterable (PRO+). GET /rhc/tokens */
export async function tokens(
  agent: Agent,
  params: {
    limit?: number;
    sort?: "last_trade" | "market_cap" | "liquidity" | "peak_mc";
    min_mc_usd?: number;
    min_liquidity_usd?: number;
    launchpad?: string;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/tokens", params);
}

/**
 * Every official Robinhood tokenized stock / ETF (NVDA, SPY, AAPL…) with live
 * price / MC / liquidity + 24h trades, ETH volume and buyer-seller split (BASIC+).
 * Identity is the issuer BEACON (EIP-1967 beacon proxy on 0xe10b6f6b…151b00,
 * read from our node), never the name — look-alike "GameStop • Robinhood Token"
 * contracts are excluded by construction. `symbol` = exact ticker
 * (case-insensitive), `q` = substring of symbol/name. GET /rhc/equities
 */
export async function equities(
  agent: Agent,
  params: {
    sort?: "volume" | "trades" | "market_cap" | "last_trade" | "symbol";
    limit?: number;
    symbol?: string;
    q?: string;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/equities", params);
}

/** Full snapshot for one RHC token (BASIC+). GET /rhc/tokens/{address} */
export async function token(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}`);
}

/** 1-minute OHLC candles (PRO+). GET /rhc/tokens/{address}/candles */
export async function tokenCandles(
  agent: Agent,
  params: { address: string; limit?: number; from?: string; to?: string },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(address)}/candles`, rest);
}

/** KOL consensus — net_flow_eth, exit rate, first touch (PRO+). GET /rhc/tokens/{address}/kol-consensus */
export async function tokenKolConsensus(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}/kol-consensus`);
}

/** 0–100 early-buyer quality score (BASIC+). GET /rhc/tokens/{address}/buyer-quality */
export async function tokenBuyerQuality(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}/buyer-quality`);
}

/** Launch-bundle detection (same_block cohort held-%) (BASIC+). GET /rhc/tokens/{address}/bundle */
/**
 * Top traders of one RHC token by REALIZED ETH flow (sell − buy) (PRO+).
 * net_eth is NOT PnL — it ignores a trader's remaining bag, so a holder ranks last.
 * GET /rhc/tokens/{address}/top-traders
 */
export async function tokenTopTraders(
  agent: Agent,
  params: { address: string; limit?: number; offset?: number },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(address)}/top-traders`, rest);
}

/**
 * Net buy/sell flow by mutually-exclusive trader cohort (PRO+).
 * net_eth = sell − buy, so POSITIVE means that cohort DISTRIBUTED.
 * GET /rhc/tokens/{address}/flow
 */
export async function tokenFlow(
  agent: Agent,
  params: { address: string; window?: "1h" | "6h" | "24h" | "7d" },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(address)}/flow`, rest);
}

/**
 * Peak MC, drawdown and high-water curve (PRO+). Returns BOTH peak_mc_usd_recorded
 * (what deployer tiering uses; sampled from write batches so it can undercount) and
 * peak_mc_usd_observed (candle max, always >= recorded).
 * GET /rhc/tokens/{address}/peak-history
 */
export async function tokenPeakHistory(
  agent: Agent,
  params: { address: string; window?: "24h" | "7d" | "30d" | "all"; curve?: "true" | "false" },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(address)}/peak-history`, rest);
}

/**
 * EVM-native risk, computed LIVE on-chain (PRO+). Not the Solana model: EVM has no
 * mint/freeze authority, so an absent capability flag is the norm and NOT a safety
 * signal. The load-bearing field is sellability.sellable, simulated at head.
 * GET /rhc/tokens/{address}/risk
 */
export async function tokenRisk(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}/risk`);
}

/**
 * Exact holders + concentration from ERC-20 Transfer-log replay, reconciled against
 * on-chain totalSupply() (PRO+). Check `verified` first. Concentration excludes pools
 * and burns; balance is a uint256 decimal STRING. `holder_growth.{1h,24h,7d}` =
 * entered / entered_still_holding / exited / net (≈ Δ holder_count) per window; a
 * window is null only when the chain had no ingested trades in it.
 * GET /rhc/tokens/{address}/holders
 */
export async function tokenHolders(
  agent: Agent,
  params: { address: string; limit?: number; offset?: number },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(address)}/holders`, rest);
}

export async function tokenBundle(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}/bundle`);
}

/**
 * Up to 50 RHC tokens in ONE call — metadata, price/MC/FDV/liquidity, peak MC and
 * deployer reputation. Set-based server-side (3 queries total), not a fan-out.
 * Unknown addresses echo back as found:false so the array stays positional (BASIC+).
 * POST /rhc/token/batch
 */
export async function tokenBatch(agent: Agent, params: { addresses: string[] }) {
  return restQuery(agent, "POST", "/rhc/token/batch", params);
}

/**
 * Early-buyer quality for several RHC tokens in one call. **Max 20 addresses**, not
 * the Solana batch cap of 50 — each token is a per-token cohort computation, not a
 * set-based lookup. A token that fails to score degrades to an error entry rather
 * than failing the batch (BASIC+). POST /rhc/tokens/batch/buyer-quality
 */
export async function tokensBatchBuyerQuality(agent: Agent, params: { addresses: string[] }) {
  return restQuery(agent, "POST", "/rhc/tokens/batch/buyer-quality", params);
}

// ── Deployer hunter ──

/**
 * Deployer reputation leaderboard ($40K graduation / $100K runner milestones) (BASIC+).
 * NOTE: `tier` rides `runner_rate` (the $100K bar) and requires deploy history since
 * migration 267 — `graduation_rate` is still returned but no longer sets the tier.
 * GET /rhc/deployer-hunter/leaderboard
 */
export async function deployerLeaderboard(
  agent: Agent,
  params: {
    sort?: "graduation_rate" | "runner_rate" | "tokens_deployed" | "best_peak_mc_usd" | "last_deploy_at";
    tier?: "elite" | "good" | "neutral" | "spammer";
    min_tokens?: number;
    limit?: number;
    offset?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/deployer-hunter/leaderboard", params);
}

/** Single deployer profile — 200 with is_deployer:false for unknown wallets (BASIC+). GET /rhc/deployer-hunter/{address} */
export async function deployerProfile(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/deployer-hunter/${encodeURIComponent(params.address)}`);
}

/**
 * Is this deployer getting better or worse? Streaks, a 10-token rolling success rate,
 * trend, deploy cadence and recovery speed. The per-token success event is the $40K
 * peak-MC GRADUATION (RHC launchpads are direct-to-DEX — there is no bonding curve);
 * `success_metric` states that explicitly (BASIC+).
 * GET /rhc/deployer-hunter/{address}/trajectory
 */
export async function deployerTrajectory(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/deployer-hunter/${encodeURIComponent(params.address)}/trajectory`);
}

/**
 * Paginated launch history for one deployer, enriched with live + peak MC (BASIC+).
 * `sort=peak_mc_usd` re-orders the fetched PAGE only (echoed as sort_scope:"page") —
 * it is not a global top-tokens ranking. GET /rhc/deployer-hunter/{address}/tokens
 */
export async function deployerTokens(
  agent: Agent,
  params: { address: string; limit?: number; offset?: number; sort?: "first_seen_at" | "peak_mc_usd" },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/deployer-hunter/${encodeURIComponent(address)}/tokens`, rest);
}

/**
 * Full token-deploy history for one deployer plus their reputation row (PRO+ — the
 * point-in-time profile stays BASIC). RHC has no per-day reputation snapshots, so this
 * is a deploy history, not a daily tier time-series.
 * GET /rhc/deployer-hunter/{address}/history
 */
export async function deployerHistory(
  agent: Agent,
  params: { address: string; limit?: number; offset?: number },
) {
  const { address, ...rest } = params;
  return restQuery(agent, "GET", `/rhc/deployer-hunter/${encodeURIComponent(address)}/history`, rest);
}

/**
 * The highest-peaking tokens launched by REPUTABLE (elite/good) deployers in a window —
 * "what did the deployers worth tracking actually produce" (BASIC+).
 * GET /rhc/deployer-hunter/best-tokens
 */
export async function deployerBestTokens(
  agent: Agent,
  params: { period?: "24h" | "7d" | "30d" | "all"; limit?: number } = {},
) {
  return restQuery(agent, "GET", "/rhc/deployer-hunter/best-tokens", params);
}

/**
 * Chain-wide deployer reputation summary — population per tier, spam token share, alert
 * volume, and `tier_rules`, the thresholds actually in force: elite/good ride
 * `runner_rate` ($100K peak MC) since migration 267; `spammer` keys off
 * `graduation_rate` ($40K) (BASIC+). GET /rhc/deployer-hunter/stats
 */
export async function deployerStats(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/deployer-hunter/stats");
}

/**
 * Deployer signal feed — new_deploy / graduated events, newest first (BASIC+; ULTRA gets
 * the full limit, BASIC/PRO share a 50-alert cap).
 *
 * A tradability filter (`liquidity_usd >= $100`) runs BY DEFAULT — pass
 * `include_untradeable: true` for the raw tape. `tier` is resolved at READ time from the
 * live reputation table, with `tier_at_alert` / `tier_is_stale` exposing snapshot drift.
 * GET /rhc/deployer-hunter/alerts
 */
export async function deployerAlerts(
  agent: Agent,
  params: {
    deployer_tier?: "elite" | "good" | "neutral" | "spammer";
    priority?: "high" | "medium";
    alert_type?: "new_deploy" | "graduated";
    launchpad?: string;
    min_mc?: number;
    limit?: number;
    offset?: number;
    /** Poll forward — only alerts strictly newer than this ISO timestamp. */
    since?: string;
    /** Page back — only alerts strictly older than this ISO timestamp. */
    before?: string;
    /** Disables the default liquidity gate. */
    include_untradeable?: boolean;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/deployer-hunter/alerts", params);
}

/**
 * Recent graduations, newest peak first. On RHC a graduation is the $40K peak-MC
 * milestone (no bonding curve), so the set is defined purely by peak MC; `min_peak` only
 * raises that floor (BASIC+). GET /rhc/deployer-hunter/recent-bonds
 */
export async function recentBonds(
  agent: Agent,
  params: {
    deployer_tier?: "elite" | "good" | "neutral" | "spammer";
    min_peak?: number;
    limit?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/deployer-hunter/recent-bonds", params);
}

// ── Alpha wallets ──

/** Smart-money wallet ranking by realized on-chain performance (PRO+). GET /rhc/alpha-wallets */
export async function alphaWallets(
  agent: Agent,
  params: {
    classification?: "all" | "human" | "bot" | "smart_money";
    identity?: "all" | "known_kol" | "unknown";
    min_memecoin_share?: number;
    max_avg_mc_usd?: number;
    min_net_eth?: number;
    min_win_rate?: number;
    max_win_rate?: number;
    min_trades?: number;
    min_tokens?: number;
    min_buy_eth?: number;
    active_hours?: number;
    sort?: "net_eth" | "win_rate" | "trades" | "tokens" | "buy_eth" | "memecoin_share" | "last_trade_at";
    order?: "desc" | "asc";
    limit?: number;
    offset?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/alpha-wallets", params);
}

// ── Wallet intelligence ──
//
// The profile / pnl / positions trio shares ONE 90-day snapshot cache server-side,
// so calling all three on an address costs roughly one computation (`cache_hit`
// says which call paid for it). Every figure is ETH-denominated. Cost basis is
// FIFO over the rolling window, so a position opened before the window reads as a
// sell with no matching buy — `cost_basis_observable_from` discloses that.

/**
 * Any RHC wallet's 90-day trading profile — ETH FIFO PnL, per-token breakdown,
 * recent trades and a reputation block (tracked KOL, known deployer + tier,
 * alpha-ranked, dump-cluster member, early-buyer count). `unattributed_trades`
 * counts pre-2026-07-18 rows with a NULL trader_eoa: unattributable by design and
 * excluded from PnL, so a low `analyzed_trades` on an old wallet is a data-window
 * limit, not inactivity (PRO+). GET /rhc/wallet/{address}
 */
export async function wallet(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/wallet/${encodeURIComponent(params.address)}`);
}

/**
 * Full FIFO cost-basis PnL over 90 days — realized/unrealized split, daily curve,
 * closed positions with ROI and hold time, open positions marked to market. Same
 * FIFO implementation as the Solana PnL endpoint, so the two chains are directly
 * comparable (PRO+). GET /rhc/wallet/{address}/pnl
 */
export async function walletPnl(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/wallet/${encodeURIComponent(params.address)}/pnl`);
}

/**
 * Only what the wallet still holds, marked to the current price — the same FIFO
 * pass as walletPnl without the curve and closed positions. Check
 * `liquidity_basis`: `v4_virtual_ceiling` means `liquidity_usd` is a bonding-curve
 * ceiling, NOT withdrawable TVL, so never size an exit against it (PRO+).
 * GET /rhc/wallet/{address}/positions
 */
export async function walletPositions(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/wallet/${encodeURIComponent(params.address)}/positions`);
}

/**
 * One wallet's swaps, newest first, keyset-paginated on an opaque `next_before`.
 * Filters by WALLET — `trades({ token })` filters the global tape by TOKEN, which
 * is a different index path (PRO+). GET /rhc/wallet/{address}/trades
 */
export async function walletTrades(
  agent: Agent,
  params: {
    address: string;
    limit?: number;
    before?: string;
    since?: string;
    action?: "buy" | "sell";
    token?: string;
  },
) {
  const { address, ...query } = params;
  return restQuery(agent, "GET", `/rhc/wallet/${encodeURIComponent(address)}/trades`, query);
}

// ── Wallet tracker (watchlist) ──
//
// Quotas are PER CHAIN: PRO 50 / ULTRA 100 / BUSINESS 500 RHC wallets, independent
// of the Solana watchlist, so adopting RHC never shrinks an existing Solana list.

/** Your RHC watchlist, with count/limit/remaining (PRO+). GET /rhc/wallet-tracker/watchlist */
export async function walletTrackerList(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/wallet-tracker/watchlist");
}

/**
 * WRITES — track an RHC wallet. Stored lowercase to match `rhc_trades.trader_eoa`;
 * a checksummed `0xAbC…` would join to nothing and look permanently silent.
 * 409 if already tracked, 403 once at the tier cap (PRO+).
 * POST /rhc/wallet-tracker/watchlist
 */
export async function walletTrackerAdd(
  agent: Agent,
  params: { wallet_address: string; label?: string },
) {
  return restQuery(agent, "POST", "/rhc/wallet-tracker/watchlist", params);
}

/**
 * DESTRUCTIVE — untrack an RHC wallet, freeing a quota slot. 404 if it is not on
 * your list (PRO+). DELETE /rhc/wallet-tracker/watchlist/{address}
 */
export async function walletTrackerRemove(agent: Agent, params: { address: string }) {
  return restQuery(agent, "DELETE", `/rhc/wallet-tracker/watchlist/${encodeURIComponent(params.address)}`);
}

/**
 * WRITES — relabel a tracked wallet. `label: null` clears it (accepted here,
 * unlike on add, where null is rejected) (PRO+).
 * PATCH /rhc/wallet-tracker/watchlist/{address}
 */
export async function walletTrackerRelabel(
  agent: Agent,
  params: { address: string; label: string | null },
) {
  return restQuery(
    agent,
    "PATCH",
    `/rhc/wallet-tracker/watchlist/${encodeURIComponent(params.address)}`,
    { label: params.label },
  );
}

/**
 * Merged trade feed across every tracked RHC wallet, each row tagged with its
 * watchlist label. The cursor (`next_before`) is an opaque keyset matching the
 * rest of the RHC tree, NOT the Solana tracker's integer epoch. A `wallet` filter
 * must already be tracked (PRO+). GET /rhc/wallet-tracker/trades
 */
export async function walletTrackerTrades(
  agent: Agent,
  params?: {
    limit?: number;
    before?: string;
    wallet?: string;
    action?: "buy" | "sell";
    token?: string;
  },
) {
  return restQuery(agent, "GET", "/rhc/wallet-tracker/trades", params);
}

/**
 * Per-wallet buy/sell/volume rollup across your tracked RHC wallets. Sourced from
 * `rhc_trades` directly, not a per-subscriber capture log — so a newly tracked
 * wallet has full history immediately, which the Solana tracker cannot do.
 * `stats_unavailable: true` means the rollup timed out and the stats are zeroed,
 * not absent (PRO+). GET /rhc/wallet-tracker/summary
 */
export async function walletTrackerSummary(
  agent: Agent,
  params?: { period?: string; wallet?: string },
) {
  return restQuery(agent, "GET", "/rhc/wallet-tracker/summary", params);
}

// ── Rule engine: copy-trade, price alerts, coordination, first touches ──
//
// The only WRITE surfaces on Robinhood Chain. They create SERVER-SIDE RULES that
// deliver signals to a webhook and/or WebSocket — nothing is ever executed
// on-chain, and a fired copy-trade rule returns a SUGGESTED size, not an order.
//
// Every quota here is PER CHAIN: a full set of Solana rules does not consume RHC
// capacity, and vice versa.

/** List your RHC copy-trade rules (PRO+). GET /rhc/copytrade/subscriptions */
export async function copytradeRules(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/copytrade/subscriptions");
}

/**
 * Create an RHC copy-trade rule (PRO+). Amounts are ETH (`min_trade_eth`,
 * `sizing_amount`), not SOL, and there is deliberately NO market-cap band on RHC
 * copy-trade — the producer's event carries no market cap, so a band could only be
 * a per-event lookup in the hot path of a ~3.3M trades/day chain.
 *
 * `webhook_url` is required unless `delivery_mode` is `websocket`. The returned
 * `webhook_secret` is shown ONCE — store it. POST /rhc/copytrade/subscriptions
 */
export async function createCopytradeRule(
  agent: Agent,
  params: {
    name?: string;
    /** 1-250 EVM addresses; the per-tier cap is enforced server-side. */
    source_wallets: string[];
    min_trade_eth?: number;
    only_action?: "buy" | "sell" | "both";
    sizing_mode?: "fixed" | "proportional" | "percent_source";
    sizing_amount: number;
    delivery_mode?: "webhook" | "websocket" | "both";
    webhook_url?: string;
  },
) {
  return restQuery(agent, "POST", "/rhc/copytrade/subscriptions", params);
}

/** One copy-trade rule by numeric id (PRO+). GET /rhc/copytrade/subscriptions/{id} */
export async function copytradeRule(agent: Agent, params: { id: number }) {
  return restQuery(agent, "GET", `/rhc/copytrade/subscriptions/${params.id}`);
}

/**
 * Update a copy-trade rule (PRO+) — partial, send only what changes. The source
 * wallet cap is re-checked, so a rule cannot be PATCHed past its tier.
 * PATCH /rhc/copytrade/subscriptions/{id}
 */
export async function updateCopytradeRule(
  agent: Agent,
  params: {
    id: number;
    name?: string | null;
    source_wallets?: string[];
    min_trade_eth?: number;
    only_action?: "buy" | "sell" | "both";
    sizing_mode?: "fixed" | "proportional" | "percent_source";
    sizing_amount?: number;
    delivery_mode?: "webhook" | "websocket" | "both";
    webhook_url?: string | null;
    is_active?: boolean;
  },
) {
  const { id, ...body } = params;
  return restQuery(agent, "PATCH", `/rhc/copytrade/subscriptions/${id}`, body);
}

/** Delete a copy-trade rule (PRO+). DELETE /rhc/copytrade/subscriptions/{id} */
export async function deleteCopytradeRule(agent: Agent, params: { id: number }) {
  return restQuery(agent, "DELETE", `/rhc/copytrade/subscriptions/${params.id}`);
}

/**
 * Fire history for your copy-trade rules — the CATCH-UP path after a missed webhook
 * or a dropped WS connection, not a live stream. Retained 7 days (PRO+).
 * GET /rhc/copytrade/signals
 */
export async function copytradeSignals(
  agent: Agent,
  params: {
    /** 1-500, default 50. */
    limit?: number;
    /** Restrict to one rule you own. */
    subscription_id?: number;
    /** ISO 8601 — only signals fired at or after this instant. */
    since?: string;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/copytrade/signals", params);
}

/** List your RHC price alerts (PRO+). GET /rhc/price-alerts */
export async function priceAlerts(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/price-alerts");
}

/**
 * Create an RHC price alert (PRO+). Market-cap denominated: the baseline MC is
 * captured NOW, so the alert is a delta from the moment you set it, and the token
 * must already be tracked with a market cap or the call 400s.
 *
 * LATENCY: RHC alerts are evaluated on a ~15 SECOND POLL of rhc_token_prices, not
 * a live price loop. Effective latency is that interval plus the token's own
 * price-update cadence — NOT the sub-second figure the Solana alerts achieve.
 * Alerts expire 30 days after creation. POST /rhc/price-alerts
 */
export async function createPriceAlert(
  agent: Agent,
  params: {
    name?: string;
    /** EVM token address (0x, 40 hex). */
    token_address: string;
    /** Percent drop from the captured baseline MC, 0.01-99.99. */
    drop_pct: number;
    /** Optional second leg — percent recovery off the dip low, 0.01-1000. */
    recovery_pct?: number;
    delivery_mode?: "webhook" | "websocket" | "both";
    webhook_url?: string;
  },
) {
  return restQuery(agent, "POST", "/rhc/price-alerts", params);
}

/** One price alert by numeric id (PRO+). GET /rhc/price-alerts/{id} */
export async function priceAlert(agent: Agent, params: { id: number }) {
  return restQuery(agent, "GET", `/rhc/price-alerts/${params.id}`);
}

/**
 * Update a price alert (PRO+). `token_address`, `drop_pct` and `recovery_pct` are
 * IMMUTABLE — changing a threshold would make the alert's recorded events
 * uninterpretable, so delete and recreate instead. PATCH /rhc/price-alerts/{id}
 */
export async function updatePriceAlert(
  agent: Agent,
  params: {
    id: number;
    name?: string | null;
    delivery_mode?: "webhook" | "websocket" | "both";
    webhook_url?: string | null;
    is_active?: boolean;
  },
) {
  const { id, ...body } = params;
  return restQuery(agent, "PATCH", `/rhc/price-alerts/${id}`, body);
}

/** Delete a price alert (PRO+). DELETE /rhc/price-alerts/{id} */
export async function deletePriceAlert(agent: Agent, params: { id: number }) {
  return restQuery(agent, "DELETE", `/rhc/price-alerts/${params.id}`);
}

/**
 * Dip / recovery fire history for your price alerts — the CATCH-UP path, not a live
 * stream. Retained 30 days (PRO+). GET /rhc/price-alerts/events
 */
export async function priceAlertEvents(
  agent: Agent,
  params: {
    /** 1-500, default 50. */
    limit?: number;
    event_type?: "dip" | "recovery";
    /** ISO 8601 — only events fired at or after this instant. */
    since?: string;
    /** Restrict to one alert you own. */
    alert_id?: number;
  } = {},
) {
  return restQuery(agent, "GET", "/rhc/price-alerts/events", params);
}

/** List your RHC KOL coordination alert rules (PRO+). GET /rhc/kol/coordination/alerts */
export async function coordinationAlertRules(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/kol/coordination/alerts");
}

/**
 * Create a coordination alert rule — fire when min_kols+ distinct tracked KOLs buy
 * the same RHC token inside window_minutes (PRO+).
 *
 * Scoring is the shared v1 scorer, so the number is comparable to Solana, but on
 * RHC the `quality` component is real (KOL 7-day win rate) while `earliness` is
 * DEFAULTED — RHC has no early-entry equivalent. Each fired signal records which
 * components were real in `score_inputs`. POST /rhc/kol/coordination/alerts
 */
export async function createCoordinationAlertRule(
  agent: Agent,
  params: {
    name?: string;
    /** 2-50, default 3. */
    min_kols?: number;
    /** 1-60, default 15. */
    window_minutes?: number;
    /** 0-100, default 0. */
    min_score?: number;
    /** 1-1440 minutes, default 30. */
    cooldown_min?: number;
    /** Re-fire inside the cooldown when the score jumps this much. 0-100, default 20. */
    score_jump_break?: number;
    min_mc_usd?: number | null;
    max_mc_usd?: number | null;
    delivery_mode?: "websocket" | "webhook" | "both";
    webhook_url?: string;
  } = {},
) {
  return restQuery(agent, "POST", "/rhc/kol/coordination/alerts", params);
}

/** One coordination alert rule by UUID (PRO+). GET /rhc/kol/coordination/alerts/{id} */
export async function coordinationAlertRule(agent: Agent, params: { id: string }) {
  return restQuery(agent, "GET", `/rhc/kol/coordination/alerts/${encodeURIComponent(params.id)}`);
}

/** Update a coordination alert rule (PRO+). PATCH /rhc/kol/coordination/alerts/{id} */
export async function updateCoordinationAlertRule(
  agent: Agent,
  params: {
    /** UUID. */
    id: string;
    name?: string | null;
    min_kols?: number;
    window_minutes?: number;
    min_score?: number;
    cooldown_min?: number;
    score_jump_break?: number;
    min_mc_usd?: number | null;
    max_mc_usd?: number | null;
    delivery_mode?: "websocket" | "webhook" | "both";
    webhook_url?: string | null;
    is_active?: boolean;
  },
) {
  const { id, ...body } = params;
  return restQuery(agent, "PATCH", `/rhc/kol/coordination/alerts/${encodeURIComponent(id)}`, body);
}

/** Delete a coordination alert rule (PRO+). DELETE /rhc/kol/coordination/alerts/{id} */
export async function deleteCoordinationAlertRule(agent: Agent, params: { id: string }) {
  return restQuery(agent, "DELETE", `/rhc/kol/coordination/alerts/${encodeURIComponent(params.id)}`);
}

/**
 * RHC first-touch subscription filters. Deliberately narrower than Solana's: RHC has
 * no scout score, so `min_scout_tier` / `min_n_touches` are NOT offered — a filter
 * that silently matched nothing would be worse than its absence. Unknown keys are
 * REJECTED, not ignored.
 */
export interface RhcFirstTouchFilters {
  /** Single KOL EVM address — lowercased on write. */
  kol?: string;
  min_first_buy_eth?: number;
  /** 0-1, from the RHC KOL win-rate view. */
  min_kol_winrate?: number;
  strategy?: "scalper" | "day_trader" | "swing" | "inactive" | "unscored";
  min_mc_usd?: number;
  max_mc_usd?: number;
}

/** List your RHC first-touch subscriptions (ULTRA+). GET /rhc/kol/first-touches/subscriptions */
export async function firstTouchSubscriptions(agent: Agent) {
  return restQuery(agent, "GET", "/rhc/kol/first-touches/subscriptions");
}

/**
 * Subscribe to RHC first touches — push when a token gets its FIRST tracked-KOL buy,
 * the earliest discovery signal on the chain (ULTRA+).
 * POST /rhc/kol/first-touches/subscriptions
 */
export async function createFirstTouchSubscription(
  agent: Agent,
  params: {
    name?: string;
    filters?: RhcFirstTouchFilters;
    delivery_mode?: "websocket" | "webhook" | "both";
    webhook_url?: string;
  } = {},
) {
  return restQuery(agent, "POST", "/rhc/kol/first-touches/subscriptions", params);
}

/** One first-touch subscription by UUID (ULTRA+). GET /rhc/kol/first-touches/subscriptions/{id} */
export async function firstTouchSubscription(agent: Agent, params: { id: string }) {
  return restQuery(agent, "GET", `/rhc/kol/first-touches/subscriptions/${encodeURIComponent(params.id)}`);
}

/**
 * Update a first-touch subscription (ULTRA+). `filters` is a WHOLE-OBJECT replace,
 * not a merge — send the complete filter set you want, otherwise removing a filter
 * would be impossible to express. PATCH /rhc/kol/first-touches/subscriptions/{id}
 */
export async function updateFirstTouchSubscription(
  agent: Agent,
  params: {
    /** UUID. */
    id: string;
    name?: string | null;
    filters?: RhcFirstTouchFilters;
    delivery_mode?: "websocket" | "webhook" | "both";
    webhook_url?: string | null;
    is_active?: boolean;
  },
) {
  const { id, ...body } = params;
  return restQuery(agent, "PATCH", `/rhc/kol/first-touches/subscriptions/${encodeURIComponent(id)}`, body);
}

/** Delete a first-touch subscription (ULTRA+). DELETE /rhc/kol/first-touches/subscriptions/{id} */
export async function deleteFirstTouchSubscription(agent: Agent, params: { id: string }) {
  return restQuery(agent, "DELETE", `/rhc/kol/first-touches/subscriptions/${encodeURIComponent(params.id)}`);
}
