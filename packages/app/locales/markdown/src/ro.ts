import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Romanian. */
export const ro: MarkdownTranslations = {
  'markdown.components.invalid':
    'components conține o intrare care nu este un component React și nici un nume de element.',
  'markdown.components.unsupported':
    'Furnizorul marked nu poate folosi components, deoarece returnează un șir HTML. Folosiți elementAttributes pentru a adăuga atribute.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" nu este un nume de atribut (pe <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nu poate seta "{{name}}" pe <{{element}}>: este deținut de renderer',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes numește <{{element}}>, pe care markdown nu îl produce',
  'markdown.footnotes.backToReference': 'Înapoi la referința {{reference}}',
  'markdown.footnotes.label': 'Note de subsol',
}
