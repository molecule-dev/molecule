import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Norwegian Bokmål. */
export const nb: MarkdownTranslations = {
  'markdown.components.invalid':
    'components inneholder en oppføring som ikke er en React-komponent eller et elementnavn.',
  'markdown.components.unsupported':
    'marked-leverandøren kan ikke bruke components, fordi den returnerer en HTML-streng. Bruk elementAttributes til å legge til attributter.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" er ikke et attributtnavn (på <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kan ikke angi "{{name}}" på <{{element}}>: rendereren eier den',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes navngir <{{element}}>, som markdown ikke produserer',
  'markdown.footnotes.backToReference': 'Tilbake til referanse {{reference}}',
  'markdown.footnotes.label': 'Fotnoter',
}
