import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Croatian. */
export const hr: MarkdownTranslations = {
  'markdown.components.invalid':
    'components sadrži unos koji nije React komponenta ni naziv elementa.',
  'markdown.components.unsupported':
    'marked pružatelj ne može koristiti components jer vraća HTML niz. Upotrijebite elementAttributes za dodavanje atributa.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nije naziv atributa (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ne može postaviti "{{name}}" na <{{element}}>: renderer to posjeduje',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes navodi <{{element}}>, koji markdown ne proizvodi',
  'markdown.footnotes.backToReference': 'Natrag na referencu {{reference}}',
  'markdown.footnotes.label': 'Bilješke',
}
