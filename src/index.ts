import {
  kolFeed,
  kolLeaderboard,
  kolHotTokens,
  kolProfile,
  kolCoordination,
  kolFirstTouches,
  trades,
  tokens,
  token,
  tokenBatch,
  tokenCandles,
  tokenKolConsensus,
  tokenBuyerQuality,
  tokensBatchBuyerQuality,
  tokenBundle,
  deployerLeaderboard,
  deployerProfile,
  deployerTrajectory,
  deployerTokens,
  deployerHistory,
  deployerBestTokens,
  deployerStats,
  deployerAlerts,
  recentBonds,
  alphaWallets,
} from "./tools/index.js";
import { kolFeedAction } from "./actions/kolFeed.js";
import { kolLeaderboardAction } from "./actions/kolLeaderboard.js";
import { kolHotTokensAction } from "./actions/kolHotTokens.js";
import { kolProfileAction } from "./actions/kolProfile.js";
import { kolCoordinationAction } from "./actions/kolCoordination.js";
import { kolFirstTouchesAction } from "./actions/kolFirstTouches.js";
import { tradesAction } from "./actions/trades.js";
import { tokensAction } from "./actions/tokens.js";
import { tokenAction } from "./actions/token.js";
import { tokenBatchAction } from "./actions/tokenBatch.js";
import { tokenCandlesAction } from "./actions/tokenCandles.js";
import { tokenKolConsensusAction } from "./actions/tokenKolConsensus.js";
import { tokenBuyerQualityAction } from "./actions/tokenBuyerQuality.js";
import { tokensBatchBuyerQualityAction } from "./actions/tokensBatchBuyerQuality.js";
import { tokenBundleAction } from "./actions/tokenBundle.js";
import { deployerLeaderboardAction } from "./actions/deployerLeaderboard.js";
import { deployerProfileAction } from "./actions/deployerProfile.js";
import { deployerTrajectoryAction } from "./actions/deployerTrajectory.js";
import { deployerTokensAction } from "./actions/deployerTokens.js";
import { deployerHistoryAction } from "./actions/deployerHistory.js";
import { deployerBestTokensAction } from "./actions/deployerBestTokens.js";
import { deployerStatsAction } from "./actions/deployerStats.js";
import { deployerAlertsAction } from "./actions/deployerAlerts.js";
import { recentBondsAction } from "./actions/recentBonds.js";
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
    kolCoordination,
    kolFirstTouches,
    trades,
    tokens,
    token,
    tokenBatch,
    tokenCandles,
    tokenKolConsensus,
    tokenBuyerQuality,
    tokensBatchBuyerQuality,
    tokenBundle,
    deployerLeaderboard,
    deployerProfile,
    deployerTrajectory,
    deployerTokens,
    deployerHistory,
    deployerBestTokens,
    deployerStats,
    deployerAlerts,
    recentBonds,
    alphaWallets,
  },
  actions: [
    kolFeedAction,
    kolLeaderboardAction,
    kolHotTokensAction,
    kolProfileAction,
    kolCoordinationAction,
    kolFirstTouchesAction,
    tradesAction,
    tokensAction,
    tokenAction,
    tokenBatchAction,
    tokenCandlesAction,
    tokenKolConsensusAction,
    tokenBuyerQualityAction,
    tokensBatchBuyerQualityAction,
    tokenBundleAction,
    deployerLeaderboardAction,
    deployerProfileAction,
    deployerTrajectoryAction,
    deployerTokensAction,
    deployerHistoryAction,
    deployerBestTokensAction,
    deployerStatsAction,
    deployerAlertsAction,
    recentBondsAction,
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
  kolCoordination,
  kolFirstTouches,
  trades,
  tokens,
  token,
  tokenBatch,
  tokenCandles,
  tokenKolConsensus,
  tokenBuyerQuality,
  tokensBatchBuyerQuality,
  tokenBundle,
  deployerLeaderboard,
  deployerProfile,
  deployerTrajectory,
  deployerTokens,
  deployerHistory,
  deployerBestTokens,
  deployerStats,
  deployerAlerts,
  recentBonds,
  alphaWallets,
  lastRateLimit,
} from "./tools/index.js";
export {
  kolFeedAction,
  kolLeaderboardAction,
  kolHotTokensAction,
  kolProfileAction,
  kolCoordinationAction,
  kolFirstTouchesAction,
  tradesAction,
  tokensAction,
  tokenAction,
  tokenBatchAction,
  tokenCandlesAction,
  tokenKolConsensusAction,
  tokenBuyerQualityAction,
  tokensBatchBuyerQualityAction,
  tokenBundleAction,
  deployerLeaderboardAction,
  deployerProfileAction,
  deployerTrajectoryAction,
  deployerTokensAction,
  deployerHistoryAction,
  deployerBestTokensAction,
  deployerStatsAction,
  deployerAlertsAction,
  recentBondsAction,
  alphaWalletsAction,
};
