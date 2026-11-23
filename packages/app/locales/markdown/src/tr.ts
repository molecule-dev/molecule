import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Turkish. */
export const tr: MarkdownTranslations = {
  'markdown.components.invalid':
    'components, React bileşeni veya öğe adı olmayan bir giriş içeriyor.',
  'markdown.components.unsupported':
    'marked sağlayıcısı HTML dizesi döndürdüğü için components kullanamaz. Öznitelik eklemek için elementAttributes kullanın.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" bir öznitelik adı değil (<{{element}}> üzerinde)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> üzerinde "{{name}}" ayarlayamaz: buna işleyici sahiptir',
  'markdown.elementAttributes.unknownElement':
    "elementAttributes, markdown'ın üretmediği <{{element}}> öğesini adlandırır",
  'markdown.footnotes.backToReference': '{{reference}} başvurusuna dön',
  'markdown.footnotes.label': 'Dipnotlar',
}
