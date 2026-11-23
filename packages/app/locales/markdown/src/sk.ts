import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Slovak. */
export const sk: MarkdownTranslations = {
  'markdown.components.invalid':
    'components obsahuje položku, ktorá nie je komponentom React ani názvom elementu.',
  'markdown.components.unsupported':
    'Poskytovateľ marked nemôže používať components, pretože vracia reťazec HTML. Na pridanie atribútov použite elementAttributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nie je názov atribútu (na <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes nemôže nastaviť "{{name}}" na <{{element}}>: vlastní ho renderer',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes uvádza <{{element}}>, ktorý markdown nevytvára',
  'markdown.footnotes.backToReference': 'Späť na odkaz {{reference}}',
  'markdown.footnotes.label': 'Poznámky pod čiarou',
}
