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
 * GET sends `params` as the query string; POST (the two batch routes) sends the
 * SAME object as a JSON body, so a tool signature reads identically either way.
 */
async function restQuery(
  agent: Agent,
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
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
 * and burns; balance is a uint256 decimal STRING.
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
