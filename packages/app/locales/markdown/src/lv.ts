import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Latvian. */
export const lv: MarkdownTranslations = {
  'markdown.components.invalid':
    'components satur ierakstu, kas nav React komponente vai elementa nosaukums.',
  'markdown.components.unsupported':
    'marked nodrošinātājs nevar izmantot components, jo atgriež HTML virkni. Lai pievienotu atribūtus, izmantojiet elementAttributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nav atribūta nosaukums (uz <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nevar iestatīt "{{name}}" uz <{{element}}>: to pārvalda renderētājs',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nosauc <{{element}}>, ko markdown neizveido',
  'markdown.footnotes.backToReference': 'Atgriezties pie atsauces {{reference}}',
  'markdown.footnotes.label': 'Zemsvītras piezīmes',
}
