import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Polish. */
export const pl: MarkdownTranslations = {
  'markdown.components.invalid':
    'components zawiera wpis, który nie jest komponentem React ani nazwą elementu.',
  'markdown.components.unsupported':
    'Dostawca marked nie może używać components, ponieważ zwraca ciąg HTML. Użyj elementAttributes, aby dodać atrybuty.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nie jest nazwą atrybutu (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nie może ustawić "{{name}}" na <{{element}}>: należy to do mechanizmu renderującego',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes wskazuje <{{element}}>, którego markdown nie tworzy',
  'markdown.footnotes.backToReference': 'Powrót do odnośnika {{reference}}',
  'markdown.footnotes.label': 'Przypisy',
}
