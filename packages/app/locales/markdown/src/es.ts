import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Spanish. */
export const es: MarkdownTranslations = {
  'markdown.components.invalid':
    'components contiene una entrada que no es un componente de React ni un nombre de elemento.',
  'markdown.components.unsupported':
    'El proveedor marked no puede usar components porque devuelve una cadena HTML. Usa elementAttributes para añadir atributos.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" no es un nombre de atributo (en <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes no puede establecer "{{name}}" en <{{element}}>: lo posee el renderizador',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes nombra <{{element}}>, que markdown no produce',
  'markdown.footnotes.backToReference': 'Volver a la referencia {{reference}}',
  'markdown.footnotes.label': 'Notas al pie',
}
