import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Armenian. */
export const hy: MarkdownTranslations = {
  'markdown.components.invalid':
    'components-ը պարունակում է գրառում, որը React բաղադրիչ կամ տարրի անուն չէ։',
  'markdown.components.unsupported':
    'marked մատակարարը չի կարող օգտագործել components, քանի որ վերադարձնում է HTML տող։ Ատրիբուտներ ավելացնելու համար օգտագործեք elementAttributes։',
  'markdown.elementAttributes.invalidName': '"{{name}}" ատրիբուտի անուն չէ (<{{element}}>-ի վրա)',
  'markdown.elementAttributes.refused':
    'elementAttributes-ը չի կարող սահմանել "{{name}}" <{{element}}>-ի վրա. այն պատկանում է renderer-ին',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes-ը նշում է <{{element}}>, որը markdown չի ստեղծում',
  'markdown.footnotes.backToReference': 'Վերադառնալ {{reference}} հղումին',
  'markdown.footnotes.label': 'Ծանոթագրություններ',
}
