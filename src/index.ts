import {
  kolFeed,
  kolLeaderboard,
  kolHotTokens,
  kolProfile,
  trades,
  tokens,
  token,
  tokenCandles,
  tokenKolConsensus,
  tokenBuyerQuality,
  tokenBundle,
  deployerLeaderboard,
  deployerProfile,
  alphaWallets,
} from "./tools/index.js";
import { kolFeedAction } from "./actions/kolFeed.js";
import { kolLeaderboardAction } from "./actions/kolLeaderboard.js";
import { kolHotTokensAction } from "./actions/kolHotTokens.js";
import { kolProfileAction } from "./actions/kolProfile.js";
import { tradesAction } from "./actions/trades.js";
import { tokensAction } from "./actions/tokens.js";
import { tokenAction } from "./actions/token.js";
import { tokenCandlesAction } from "./actions/tokenCandles.js";
import { tokenKolConsensusAction } from "./actions/tokenKolConsensus.js";
import { tokenBuyerQualityAction } from "./actions/tokenBuyerQuality.js";
import { tokenBundleAction } from "./actions/tokenBundle.js";
import { deployerLeaderboardAction } from "./actions/deployerLeaderboard.js";
import { deployerProfileAction } from "./actions/deployerProfile.js";
import { alphaWalletsAction } from "./actions/alphaWallets.js";

/**
 * Robinhood Chain toolset for Solana Agent Kit.
 *
 * The intel is EVM-native and lives on Robinhood Chain (chain id 4663); this is
 * packaged in the SAK plugin shape so agent builders already on Solana Agent Kit
 * can add RHC coverage without a new framework. Auth is a single MadeOnSol
 * `msk_` key (ROBINHOOD_CHAIN_API_KEY, falling back to MADEONSOL_API_KEY).
 */
const RobinhoodChainPlugin = {
  name: "robinhood-chain",
  methods: {
    kolFeed,
    kolLeaderboard,
    kolHotTokens,
    kolProfile,
    trades,
    tokens,
    token,
    tokenCandles,
    tokenKolConsensus,
    tokenBuyerQuality,
    tokenBundle,
    deployerLeaderboard,
    deployerProfile,
    alphaWallets,
  },
  actions: [
    kolFeedAction,
    kolLeaderboardAction,
    kolHotTokensAction,
    kolProfileAction,
    tradesAction,
    tokensAction,
    tokenAction,
    tokenCandlesAction,
    tokenKolConsensusAction,
    tokenBuyerQualityAction,
    tokenBundleAction,
    deployerLeaderboardAction,
    deployerProfileAction,
    alphaWalletsAction,
  ],
  initialize(_agent: unknown) {
    // No-op — auth is initialized lazily on the first tool call.
  },
};

export default RobinhoodChainPlugin;
export {
  kolFeed,
  kolLeaderboard,
  kolHotTokens,
  kolProfile,
  trades,
  tokens,
  token,
  tokenCandles,
  tokenKolConsensus,
  tokenBuyerQuality,
  tokenBundle,
  deployerLeaderboard,
  deployerProfile,
  alphaWallets,
  lastRateLimit,
} from "./tools/index.js";
export {
  kolFeedAction,
  kolLeaderboardAction,
  kolHotTokensAction,
  kolProfileAction,
  tradesAction,
  tokensAction,
  tokenAction,
  tokenCandlesAction,
  tokenKolConsensusAction,
  tokenBuyerQualityAction,
  tokenBundleAction,
  deployerLeaderboardAction,
  deployerProfileAction,
  alphaWalletsAction,
};
