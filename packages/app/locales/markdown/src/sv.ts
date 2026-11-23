import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Swedish. */
export const sv: MarkdownTranslations = {
  'markdown.components.invalid':
    'components innehåller en post som inte är en React-komponent eller ett elementnamn.',
  'markdown.components.unsupported':
    'marked-leverantören kan inte använda components, eftersom den returnerar en HTML-sträng. Använd elementAttributes för att lägga till attribut.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" är inte ett attributnamn (på <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kan inte ange "{{name}}" på <{{element}}>: renderaren äger den',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes namnger <{{element}}>, som markdown inte producerar',
  'markdown.footnotes.backToReference': 'Tillbaka till referens {{reference}}',
  'markdown.footnotes.label': 'Fotnoter',
}
