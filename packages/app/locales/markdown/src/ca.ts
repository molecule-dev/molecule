import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Catalan. */
export const ca: MarkdownTranslations = {
  'markdown.components.invalid':
    "components conté una entrada que no és un component de React ni un nom d'element.",
  'markdown.components.unsupported':
    'El proveïdor marked no pot utilitzar components, perquè retorna una cadena HTML. Feu servir elementAttributes per afegir atributs.',
  'markdown.elementAttributes.invalidName': '"{{name}}" no és un nom d\'atribut (a <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes no pot establir "{{name}}" a <{{element}}>: el renderitzador en té la propietat',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes anomena <{{element}}>, que markdown no produeix',
  'markdown.footnotes.backToReference': 'Torna a la referència {{reference}}',
  'markdown.footnotes.label': 'Notes al peu',
}
