import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Macedonian. */
export const mk: MarkdownTranslations = {
  'markdown.components.invalid':
    'components содржи запис што не е React компонента или име на елемент.',
  'markdown.components.unsupported':
    'Давателот marked не може да користи components, бидејќи враќа HTML низа. Користете elementAttributes за да додадете атрибути.',
  'markdown.elementAttributes.invalidName': '"{{name}}" не е име на атрибут (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не може да постави "{{name}}" на <{{element}}>: рендерерот го поседува',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes го именува <{{element}}>, кој markdown не го создава',
  'markdown.footnotes.backToReference': 'Назад на референцата {{reference}}',
  'markdown.footnotes.label': 'Фусноти',
}
