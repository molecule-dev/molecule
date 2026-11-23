import type { MarkdownTranslations } from './types.js'

/** Markdown translations for German. */
export const de: MarkdownTranslations = {
  'markdown.components.invalid':
    'components enthält einen Eintrag, der keine React-Komponente und kein Elementname ist.',
  'markdown.components.unsupported':
    'Der marked-Anbieter kann components nicht verwenden, weil er einen HTML-String zurückgibt. Verwende elementAttributes, um Attribute hinzuzufügen.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ist kein Attributname (auf <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kann "{{name}}" nicht auf <{{element}}> setzen: der Renderer besitzt es',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nennt <{{element}}>, das markdown nicht erzeugt',
  'markdown.footnotes.backToReference': 'Zurück zu Referenz {{reference}}',
  'markdown.footnotes.label': 'Fußnoten',
}
