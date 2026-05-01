/** Translation keys for the embed-snippet-react locale package. */
export type EmbedSnippetTranslationKey =
  | 'embedSnippet.aria.region'
  | 'embedSnippet.heading'
  | 'embedSnippet.eyebrow'
  | 'embedSnippet.copy'
  | 'embedSnippet.copied'
  | 'embedSnippet.controls.width'
  | 'embedSnippet.controls.height'
  | 'embedSnippet.controls.theme'
  | 'embedSnippet.theme.light'
  | 'embedSnippet.theme.dark'
  | 'embedSnippet.theme.auto'

/** Translation record mapping embed-snippet keys to translated strings. */
export type EmbedSnippetTranslations = Record<EmbedSnippetTranslationKey, string>
