import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Galician. */
export const gl: MarkdownTranslations = {
  'markdown.components.invalid':
    'components contén unha entrada que non é un compoñente de React nin un nome de elemento.',
  'markdown.components.unsupported':
    'O provedor marked non pode usar components, porque devolve unha cadea HTML. Use elementAttributes para engadir atributos.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" non é un nome de atributo (en <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes non pode establecer "{{name}}" en <{{element}}>: o renderizador é o seu dono',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nomea <{{element}}>, que markdown non produce',
  'markdown.footnotes.backToReference': 'Volver á referencia {{reference}}',
  'markdown.footnotes.label': 'Notas ao pé',
}
