import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Lithuanian. */
export const lt: MarkdownTranslations = {
  'markdown.components.invalid':
    'components turi įrašą, kuris nėra React komponentas arba elemento pavadinimas.',
  'markdown.components.unsupported':
    'marked teikėjas negali naudoti components, nes grąžina HTML eilutę. Norėdami pridėti atributų, naudokite elementAttributes.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" nėra atributo pavadinimas (elemente <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes negali nustatyti "{{name}}" elemente <{{element}}>: tai priklauso atvaizduokliui',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes įvardija <{{element}}>, kurio markdown negeneruoja',
  'markdown.footnotes.backToReference': 'Grįžti į nuorodą {{reference}}',
  'markdown.footnotes.label': 'Išnašos',
}
