# solana-agent-kit-plugin-robinhood-chain

[![npm version](https://img.shields.io/npm/v/solana-agent-kit-plugin-robinhood-chain?style=flat-square)](https://www.npmjs.com/package/solana-agent-kit-plugin-robinhood-chain)
[![npm downloads](https://img.shields.io/npm/dm/solana-agent-kit-plugin-robinhood-chain?style=flat-square)](https://www.npmjs.com/package/solana-agent-kit-plugin-robinhood-chain)
[![SAK](https://img.shields.io/badge/Solana%20Agent%20Kit-plugin-blueviolet?style=flat-square)](https://github.com/sendaifun/solana-agent-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

> 🤖 **[Robinhood Chain API](https://madeonsol.com/robinhood)** · 📚 **[API docs](https://madeonsol.com/api-docs)** · 💰 **[Free API key](https://madeonsol.com/pricing)** · 🤖 **[Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit)**

**Robinhood Chain toolset for [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit).** EVM-native on-chain trading intelligence for **Robinhood Chain (chain id 4663)** — live KOL trades, token discovery, launch-bundle detection, buyer-quality scoring, deployer reputation, the DEX trade tape, and smart-money wallet rankings from [MadeOnSol](https://madeonsol.com).

> **Honest framing:** "Solana Agent Kit" is SVM-branded, and the intelligence in this package is **EVM/Robinhood Chain**, not Solana. This is a Robinhood Chain toolset packaged in the SAK plugin shape so agent builders already on Solana Agent Kit can add RHC coverage without adopting a new framework. Every field is EVM-native — `token_address` (lowercase `0x`), `eth_amount`, `tx_hash`, `block_number`, `net_flow_eth`. If you want a native RHC client, see the [`robinhood-chain-sdk`](https://www.npmjs.com/package/robinhood-chain-sdk) / [ElizaOS](https://www.npmjs.com/package/@madeonsol/plugin-robinhood-chain) packages below.

> Robinhood Chain intelligence, EVM-native: track Solana KOLs' verified RHC wallets (recovered by tracing their Solana→EVM bridge deposits — a dataset unique to MadeOnSol), rank 40k+ RHC deployers by graduation/runner rate, detect same-block launch bundles and score early-buyer cohorts, and read the Uniswap v2/v3/v4 trade tape with the real trader EOA. **Same `msk_` API key, same base URL, bundled into every tier at no extra cost.** Get a free key at [madeonsol.com/pricing](https://madeonsol.com/pricing).

New customers get a **3-day free trial** of Pro or Ultra when you pay by card — full access, nothing charged during the trial, cancel anytime. Start at [madeonsol.com/pricing](https://madeonsol.com/pricing).

## Quick start (10 seconds)

```bash
npm install solana-agent-kit-plugin-robinhood-chain
```

```ts
import { SolanaAgentKit } from "solana-agent-kit";
import RobinhoodChainPlugin from "solana-agent-kit-plugin-robinhood-chain";

const agent = new SolanaAgentKit(privateKey, rpcUrl, { ROBINHOOD_CHAIN_API_KEY: "msk_..." }); // free key at https://madeonsol.com/pricing
agent.use(RobinhoodChainPlugin);

const feed = await agent.methods.kolFeed(agent, { limit: 5, action: "buy" });
```

## Authentication

Robinhood Chain is **key-mode only** — a single MadeOnSol API key (`msk_`, Bearer). The x402 pay-per-call rail is Solana-native and is **not** available on Robinhood Chain.

| Config key | Notes |
|---|---|
| `ROBINHOOD_CHAIN_API_KEY` | Your `msk_` key. [Get a free one](https://madeonsol.com/pricing) — the same key already covers the Solana API. |
| `MADEONSOL_API_KEY` | Fallback — used if `ROBINHOOD_CHAIN_API_KEY` is unset. |

## Tools & actions

Each tool maps to one real `/rhc/*` endpoint. Tools are exposed on `agent.methods.*`; each also has an LLM action wrapper (zod-validated) for natural-language triggering.

| Tool (`agent.methods.*`) | Action | Endpoint | Tier |
|---|---|---|---|
| `kolFeed` | `RHC_KOL_FEED_ACTION` | `GET /rhc/kol/feed` | BASIC+ |
| `kolLeaderboard` | `RHC_KOL_LEADERBOARD_ACTION` | `GET /rhc/kol/leaderboard` | BASIC+ |
| `kolHotTokens` | `RHC_KOL_HOT_TOKENS_ACTION` | `GET /rhc/kol/hot-tokens` | BASIC+ |
| `kolProfile` | `RHC_KOL_PROFILE_ACTION` | `GET /rhc/kol/{wallet}` | BASIC+ |
| `trades` | `RHC_TRADES_ACTION` | `GET /rhc/trades` | PRO+ |
| `tokens` | `RHC_TOKENS_ACTION` | `GET /rhc/tokens` | PRO+ |
| `token` | `RHC_TOKEN_ACTION` | `GET /rhc/tokens/{address}` | BASIC+ |
| `tokenCandles` | `RHC_TOKEN_CANDLES_ACTION` | `GET /rhc/tokens/{address}/candles` | PRO+ |
| `tokenKolConsensus` | `RHC_KOL_CONSENSUS_ACTION` | `GET /rhc/tokens/{address}/kol-consensus` | PRO+ |
| `tokenBuyerQuality` | `RHC_BUYER_QUALITY_ACTION` | `GET /rhc/tokens/{address}/buyer-quality` | BASIC+ |
| `tokenBundle` | `RHC_TOKEN_BUNDLE_ACTION` | `GET /rhc/tokens/{address}/bundle` | BASIC+ |
| `deployerLeaderboard` | `RHC_DEPLOYER_LEADERBOARD_ACTION` | `GET /rhc/deployer-hunter/leaderboard` | BASIC+ |
| `deployerProfile` | `RHC_DEPLOYER_PROFILE_ACTION` | `GET /rhc/deployer-hunter/{address}` | BASIC+ |
| `alphaWallets` | `RHC_ALPHA_WALLETS_ACTION` | `GET /rhc/alpha-wallets` | PRO+ |

## Usage

```ts
import { SolanaAgentKit } from "solana-agent-kit";
import RobinhoodChainPlugin from "solana-agent-kit-plugin-robinhood-chain";

const agent = new SolanaAgentKit(privateKey, rpcUrl, {
  ROBINHOOD_CHAIN_API_KEY: "msk_your_api_key_here", // free at madeonsol.com/pricing
});
agent.use(RobinhoodChainPlugin);

// Live KOL feed — EVM-native (eth_amount, token_address, tx_hash, block_number)
const feed = await agent.methods.kolFeed(agent, { limit: 10, action: "buy" });

// Consensus tokens — bought by 2+ KOLs in the window
const hot = await agent.methods.kolHotTokens(agent, { window: "1h" });

// Same-block launch-bundle detection (no atomic_tx on this Arbitrum Orbit L2)
const bundle = await agent.methods.tokenBundle(agent, { address: "0x1234567890abcdef1234567890abcdef12345678" });

// KOL consensus — net_flow_eth denominated
const consensus = await agent.methods.tokenKolConsensus(agent, { address: "0x1234567890abcdef1234567890abcdef12345678" });

// Deployer reputation — $40K graduation / $100K runner milestones (direct-to-DEX chain)
const deployers = await agent.methods.deployerLeaderboard(agent, { sort: "graduation_rate", limit: 20 });

// Smart-money discovery — realized net_eth, win_rate, likely_bot
const alpha = await agent.methods.alphaWallets(agent, { classification: "smart_money", min_memecoin_share: 0.7 });

// Or let the LLM trigger actions via natural language:
// "What are KOLs buying on Robinhood Chain?" → RHC_KOL_FEED_ACTION
```

### Rate-limit headers

Every successful request populates a module-level `lastRateLimit` (`limit` / `remaining` / `reset` / `requestId`):

```ts
import { lastRateLimit } from "solana-agent-kit-plugin-robinhood-chain";
await agent.methods.kolFeed(agent, { limit: 10 });
console.log(lastRateLimit);
```

## Why Robinhood Chain

Robinhood Chain is an Arbitrum Orbit L2 (chain id 4663). Two things follow, and this toolset models both honestly:

- **No atomic multi-signer transaction** → the bundle detector reports `same_block` (3+ first buys in one block) or `none`; there is no `atomic_tx` kind.
- **Direct-to-DEX launchpads** (most RHC launchpads have no bonding curve) → "graduation" is a market-cap milestone: `graduation_rate` = share of a deployer's tokens that reached a $40K+ peak MC; `runner_rate` = share that reached $100K+.

## Tiers

| Tier | Price | Requests/day |
|------|-------|--------------|
| BASIC (free) | $0 | 200 |
| PRO | €43/mo (€430/yr) ≈ $49 | 10,000 |
| ULTRA | €131/mo (€1310/yr) ≈ $149 | 100,000 |

Robinhood Chain coverage is bundled into every tier at no extra cost. BASIC tools work with any valid key; `trades`, `tokens`, `tokenCandles`, `tokenKolConsensus`, and `alphaWallets` require PRO+. ULTRA unlocks the deepest fields (full bundle cohort with wallet identity, KOL-consensus `buyers`/`exited` lists). Get a key at [madeonsol.com/pricing](https://madeonsol.com/pricing) · pricing at [madeonsol.com/pricing](https://madeonsol.com/pricing).

## Also Available

| Platform | Package |
|---|---|
| ElizaOS | [`@madeonsol/plugin-robinhood-chain`](https://www.npmjs.com/package/@madeonsol/plugin-robinhood-chain) |
| TypeScript SDK | [`robinhood-chain-sdk`](https://www.npmjs.com/package/robinhood-chain-sdk) on npm |
| Python SDK | [`robinhood-chain`](https://pypi.org/project/robinhood-chain/) on PyPI |
| Rust SDK | [`robinhood-chain`](https://crates.io/crates/robinhood-chain) on crates.io |
| MCP Server (Claude, Cursor) | [`mcp-server-robinhood-chain`](https://www.npmjs.com/package/mcp-server-robinhood-chain) |

## Links

- **Robinhood Chain product** → https://madeonsol.com/robinhood
- **API docs** → https://madeonsol.com/api-docs
- **Free API key** → https://madeonsol.com/pricing
- **Pricing** → https://madeonsol.com/pricing

## License

MIT
