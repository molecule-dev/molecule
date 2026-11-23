import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Serbian. */
export const sr: MarkdownTranslations = {
  'markdown.components.invalid':
    'components садржи унос који није React компонента ни назив елемента.',
  'markdown.components.unsupported':
    'marked провајдер не може да користи components јер враћа HTML ниску. Користите elementAttributes да додате атрибуте.',
  'markdown.elementAttributes.invalidName': '"{{name}}" није назив атрибута (на <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes не може да постави "{{name}}" на <{{element}}>: рендерер га поседује',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes наводи <{{element}}>, који markdown не производи',
  'markdown.footnotes.backToReference': 'Назад на референцу {{reference}}',
  'markdown.footnotes.label': 'Фусноте',
}
