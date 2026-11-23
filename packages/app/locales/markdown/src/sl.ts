import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Slovenian. */
export const sl: MarkdownTranslations = {
  'markdown.components.invalid':
    'components vsebuje vnos, ki ni komponenta React ali ime elementa.',
  'markdown.components.unsupported':
    'Ponudnik marked ne more uporabljati components, ker vrne niz HTML. Za dodajanje atributov uporabite elementAttributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ni ime atributa (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes ne more nastaviti "{{name}}" na <{{element}}>: lasti ga upodabljalnik',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes poimenuje <{{element}}>, ki ga markdown ne ustvari',
  'markdown.footnotes.backToReference': 'Nazaj na sklic {{reference}}',
  'markdown.footnotes.label': 'Opombe pod črto',
}
