import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Bulgarian. */
export const bg: MarkdownTranslations = {
  'markdown.components.invalid':
    'components съдържа запис, който не е React компонент или име на елемент.',
  'markdown.components.unsupported':
    'Доставчикът marked не може да използва components, защото връща HTML низ. Използвайте elementAttributes, за да добавите атрибути.',
  'markdown.elementAttributes.invalidName': '"{{name}}" не е име на атрибут (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не може да зададе "{{name}}" на <{{element}}>: рендърърът го притежава',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes посочва <{{element}}>, който markdown не създава',
  'markdown.footnotes.backToReference': 'Назад към препратка {{reference}}',
  'markdown.footnotes.label': 'Бележки под линия',
}
