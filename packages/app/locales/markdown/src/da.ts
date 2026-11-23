import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Danish. */
export const da: MarkdownTranslations = {
  'markdown.components.invalid':
    'components indeholder en post, der ikke er en React-komponent eller et elementnavn.',
  'markdown.components.unsupported':
    'marked-udbyderen kan ikke bruge components, fordi den returnerer en HTML-streng. Brug elementAttributes til at tilføje attributter.',
  'markdown.elementAttributes.invalidName': '"{{name}}" er ikke et attributnavn (på <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes kan ikke angive "{{name}}" på <{{element}}>: rendereren ejer den',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes navngiver <{{element}}>, som markdown ikke producerer',
  'markdown.footnotes.backToReference': 'Tilbage til reference {{reference}}',
  'markdown.footnotes.label': 'Fodnoter',
}
