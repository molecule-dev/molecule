import {
  hnScore,
  pureScore,
  recencyScore,
  redditBestScore,
  redditControversialScore,
  redditHotScore,
} from './algorithms.js'
import type { RankAlgorithm, RankContext, RankItem } from './types.js'

/**
 * Compute a rank score using the named algorithm.
 *
 * Convenience dispatcher — handlers/cron workers usually call the
 * specific algorithm directly, but this is handy when the algorithm
 * choice is configurable per project.
 *
 * @param algorithm - Algorithm identifier.
 * @param item - Item being ranked.
 * @param ctx - Reference time + optional gravity.
 * @returns Numeric score; semantics depend on the chosen algorithm.
 * @throws {Error} If `algorithm` is not a known identifier.
 */
export const rankScore = (algorithm: RankAlgorithm, item: RankItem, ctx: RankContext): number => {
  switch (algorithm) {
    case 'hn':
      return hnScore(item, ctx)
    case 'reddit-hot':
      return redditHotScore(item, ctx)
    case 'reddit-best':
      return redditBestScore(item)
    case 'reddit-controversial':
      return redditControversialScore(item)
    case 'recency':
      return recencyScore(item, ctx)
    case 'score':
      return pureScore(item)
    default: {
      const exhaustive: never = algorithm
      throw new Error(`rank-score: unknown algorithm: ${String(exhaustive)}`)
    }
  }
}
