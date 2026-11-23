import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Russian. */
export const ru: MarkdownTranslations = {
  'markdown.components.invalid':
    'components содержит запись, которая не является компонентом React или именем элемента.',
  'markdown.components.unsupported':
    'Поставщик marked не может использовать components, потому что возвращает строку HTML. Используйте elementAttributes, чтобы добавить атрибуты.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" не является именем атрибута (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не может задать "{{name}}" на <{{element}}>: им владеет рендерер',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes указывает <{{element}}>, который markdown не создаёт',
  'markdown.footnotes.backToReference': 'Вернуться к ссылке {{reference}}',
  'markdown.footnotes.label': 'Сноски',
}
