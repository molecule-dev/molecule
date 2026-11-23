import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Bosnian. */
export const bs: MarkdownTranslations = {
  'markdown.components.invalid':
    'components sadrži stavku koja nije React komponenta ni naziv elementa.',
  'markdown.components.unsupported':
    'marked provajder ne može koristiti components jer vraća HTML niz. Koristite elementAttributes da dodate atribute.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nije naziv atributa (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ne može postaviti "{{name}}" na <{{element}}>: renderer to posjeduje',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes navodi <{{element}}>, koji markdown ne proizvodi',
  'markdown.footnotes.backToReference': 'Nazad na referencu {{reference}}',
  'markdown.footnotes.label': 'Fusnote',
}
