import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Czech. */
export const cs: MarkdownTranslations = {
  'markdown.components.invalid':
    'components obsahuje položku, která není komponenta React ani název elementu.',
  'markdown.components.unsupported':
    'Poskytovatel marked nemůže používat components, protože vrací řetězec HTML. Pro přidání atributů použijte elementAttributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" není název atributu (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nemůže nastavit "{{name}}" na <{{element}}>: vlastní ho renderer',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes uvádí <{{element}}>, který markdown nevytváří',
  'markdown.footnotes.backToReference': 'Zpět na odkaz {{reference}}',
  'markdown.footnotes.label': 'Poznámky pod čarou',
}
