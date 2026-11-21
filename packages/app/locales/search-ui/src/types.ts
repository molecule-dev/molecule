/** Translation keys for the search-ui locale package. */
export type SearchUiTranslationKey =
  | 'searchUi.close'
  | 'searchUi.dialogKeys'
  | 'searchUi.clear'
  | 'searchUi.removeFilter'
  | 'searchUi.count'
  | 'searchUi.help'
  | 'searchUi.syntax'
  | 'searchUi.keys'
  | 'searchUi.examplePhrase'
  | 'searchUi.exampleExcluded'
  | 'searchUi.results'
  | 'searchUi.relatedTitle'
  | 'searchUi.related'
  | 'searchUi.activeResult'
  | 'searchUi.dialogLabel'

/** Translation record mapping search-ui keys to translated strings. */
export type SearchUiTranslations = Record<SearchUiTranslationKey, string>
