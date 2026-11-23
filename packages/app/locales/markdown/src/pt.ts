import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Portuguese. */
export const pt: MarkdownTranslations = {
  'markdown.components.invalid':
    'components contém uma entrada que não é um componente React nem um nome de elemento.',
  'markdown.components.unsupported':
    'O provedor marked não pode usar components porque retorna uma string HTML. Use elementAttributes para adicionar atributos.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" não é um nome de atributo (em <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes não pode definir "{{name}}" em <{{element}}>: o renderizador é o dono',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nomeia <{{element}}>, que markdown não produz',
  'markdown.footnotes.backToReference': 'Voltar para a referência {{reference}}',
  'markdown.footnotes.label': 'Notas de rodapé',
}
