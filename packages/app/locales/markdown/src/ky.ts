import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Kyrgyz. */
export const ky: MarkdownTranslations = {
  'markdown.components.invalid':
    'components курамында React компоненти же элемент аты болуп саналбаган жазуу бар.',
  'markdown.components.unsupported':
    'marked провайдери components колдоно албайт, анткени ал HTML сапты кайтарат. Атрибуттарды кошуу үчүн elementAttributes колдонуңуз.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" атрибуттун аты эмес (<{{element}}> үстүндө)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> үстүндө "{{name}}" орното албайт: аны рендерлөөчү ээлейт',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> деп атайт, аны markdown жасабайт',
  'markdown.footnotes.backToReference': '{{reference}} шилтемесине кайтуу',
  'markdown.footnotes.label': 'Эскертүүлөр',
}
