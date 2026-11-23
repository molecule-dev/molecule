import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Albanian. */
export const sq: MarkdownTranslations = {
  'markdown.components.invalid':
    'components përmban një zë që nuk është komponent React as emër elementi.',
  'markdown.components.unsupported':
    'Ofruesi marked nuk mund të përdorë components, sepse kthen një varg HTML. Përdorni elementAttributes për të shtuar atribute.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nuk është emër atributi (në <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nuk mund të vendosë "{{name}}" në <{{element}}>: e zotëron renderuesi',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes emërton <{{element}}>, të cilin markdown nuk e prodhon',
  'markdown.footnotes.backToReference': 'Kthehu te referenca {{reference}}',
  'markdown.footnotes.label': 'Shënime në fund të faqes',
}
