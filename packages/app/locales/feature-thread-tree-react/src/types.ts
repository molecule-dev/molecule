/**
 * Translation key types for `@molecule/app-feature-thread-tree-react`.
 *
 * @module
 */

/** Translation keys consumed by the thread-tree feature. */
export type ThreadTreeTranslationKey =
  | 'threadTree.expand'
  | 'threadTree.collapse'
  | 'threadTree.expandSymbol'
  | 'threadTree.collapseSymbol'
  | 'threadTree.score'
  | 'threadTree.hiddenReplies'
  | 'threadTree.upvote'
  | 'threadTree.reply'

/** Translation record mapping thread-tree keys to translated strings. */
export type ThreadTreeTranslations = Record<ThreadTreeTranslationKey, string>
