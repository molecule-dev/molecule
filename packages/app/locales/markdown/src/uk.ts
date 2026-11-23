import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Ukrainian. */
export const uk: MarkdownTranslations = {
  'markdown.components.invalid':
    'components містить запис, який не є компонентом React або назвою елемента.',
  'markdown.components.unsupported':
    'Постачальник marked не може використовувати components, бо повертає рядок HTML. Щоб додати атрибути, використовуйте elementAttributes.',
  'markdown.elementAttributes.invalidName': '"{{name}}" не є назвою атрибута (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не може встановити "{{name}}" на <{{element}}>: ним володіє рендерер',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes називає <{{element}}>, який markdown не створює',
  'markdown.footnotes.backToReference': 'Повернутися до посилання {{reference}}',
  'markdown.footnotes.label': 'Виноски',
}
