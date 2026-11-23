import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Irish. */
export const ga: MarkdownTranslations = {
  'markdown.components.invalid':
    'Tá iontráil i components nach comhpháirt React í ná ainm eiliminte.',
  'markdown.components.unsupported':
    'Ní féidir le soláthraí marked components a úsáid, mar go dtugann sé teaghrán HTML ar ais. Úsáid elementAttributes chun tréithe a chur leis.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ní ainm tréithe é (ar <{{element}}>)',
  'markdown.elementAttributes.refused':
    'Ní féidir le elementAttributes "{{name}}" a shocrú ar <{{element}}>: is leis an rindreálaí é',
  'markdown.elementAttributes.unknownElement':
    'Ainmníonn elementAttributes <{{element}}>, nach dtáirgeann markdown',
  'markdown.footnotes.backToReference': 'Ar ais chuig tagairt {{reference}}',
  'markdown.footnotes.label': 'Nótaí bunleathanaigh',
}
