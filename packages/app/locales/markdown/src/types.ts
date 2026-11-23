/** Translation keys for the markdown locale package. */
export type MarkdownTranslationKey =
  | 'markdown.components.invalid'
  | 'markdown.components.unsupported'
  | 'markdown.elementAttributes.invalidName'
  | 'markdown.elementAttributes.refused'
  | 'markdown.elementAttributes.unknownElement'
  | 'markdown.footnotes.backToReference'
  | 'markdown.footnotes.label'

/** Translation record mapping `@molecule/app-markdown` keys to translated strings. */
export type MarkdownTranslations = Record<MarkdownTranslationKey, string>
