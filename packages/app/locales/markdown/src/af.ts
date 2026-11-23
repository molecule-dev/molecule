import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Afrikaans. */
export const af: MarkdownTranslations = {
  'markdown.components.invalid':
    "components bevat 'n inskrywing wat nie 'n React-komponent of 'n elementnaam is nie.",
  'markdown.components.unsupported':
    "Die marked-verskaffer kan nie components gebruik nie, want dit gee 'n HTML-string terug. Gebruik elementAttributes om kenmerke by te voeg.",
  'markdown.elementAttributes.invalidName':
    '"{{name}}" is nie \'n kenmerknaam nie (op <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kan nie "{{name}}" op <{{element}}> stel nie: die weergewer besit dit',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes noem <{{element}}>, wat markdown nie produseer nie',
  'markdown.footnotes.backToReference': 'Terug na verwysing {{reference}}',
  'markdown.footnotes.label': 'Voetnote',
}
