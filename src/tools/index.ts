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
 * https://madeonsol.com/developer. The x402 pay-per-call rail is Solana-native
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
        "  → Get a free `msk_` key (covers Robinhood Chain at no extra cost) at https://madeonsol.com/developer\n" +
        "  → Set ROBINHOOD_CHAIN_API_KEY (or MADEONSOL_API_KEY) in the agent config.\n",
    );
  }
}

/** GET against `/api/v1{path}` with Bearer auth. `path` starts with `/rhc/...`. */
async function restQuery(
  agent: Agent,
  method: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  initAuth(agent);
  if (!_authHeaders || !_authHeaders.Authorization) {
    throw new Error(
      "MadeOnSol API key required for Robinhood Chain. Get a free `msk_` key at https://madeonsol.com/developer",
    );
  }
  const url = new URL(`/api/v1${path}`, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { method, headers: _authHeaders });
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
export async function tokenBundle(agent: Agent, params: { address: string }) {
  return restQuery(agent, "GET", `/rhc/tokens/${encodeURIComponent(params.address)}/bundle`);
}

// ── Deployer hunter ──

/** Deployer reputation leaderboard ($40K graduation / $100K runner milestones) (BASIC+). GET /rhc/deployer-hunter/leaderboard */
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
