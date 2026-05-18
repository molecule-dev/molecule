/** Translation keys for the thread-tree-react locale package. */
export type ThreadTreeTranslationKey =
  | 'threadTree.expand'
  | 'threadTree.expandSymbol'
  | 'threadTree.collapseSymbol'
  | 'threadTree.score'
  | 'threadTree.upvote'
  | 'threadTree.reply'

/** Translation record mapping thread-tree-react keys to translated strings. */
export type ThreadTreeTranslations = Record<ThreadTreeTranslationKey, string>
