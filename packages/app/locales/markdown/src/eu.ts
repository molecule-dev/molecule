import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Basque. */
export const eu: MarkdownTranslations = {
  'markdown.components.invalid':
    'components-ek React osagai edo elementu-izen ez den sarrera bat du.',
  'markdown.components.unsupported':
    'marked hornitzaileak ezin ditu components erabili, HTML katea itzultzen duelako. Erabili elementAttributes atributuak gehitzeko.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ez da atributu-izen bat (<{{element}}>-en)',
  'markdown.elementAttributes.refused':
    'elementAttributes-ek ezin du "{{name}}" ezarri <{{element}}>-en: renderizatzailearena da',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes-ek <{{element}}> izendatzen du, markdown-ek sortzen ez duena',
  'markdown.footnotes.backToReference': 'Itzuli {{reference}} erreferentziara',
  'markdown.footnotes.label': 'Oin-oharrak',
}
