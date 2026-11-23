import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Chinese (Traditional). */
export const zhTW: MarkdownTranslations = {
  'markdown.components.invalid': 'components 中包含一個既不是 React 元件也不是元素名稱的項目。',
  'markdown.components.unsupported':
    'marked 提供者無法使用 components，因為它會傳回 HTML 字串。請使用 elementAttributes 新增屬性。',
  'markdown.elementAttributes.invalidName': '"{{name}}" 不是屬性名稱（在 <{{element}}> 上）',
  'markdown.elementAttributes.refused':
    'elementAttributes 無法在 <{{element}}> 上設定 "{{name}}"：該屬性由轉譯器所擁有',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes 指定了 markdown 不會產生的 <{{element}}>',
  'markdown.footnotes.backToReference': '返回引用 {{reference}}',
  'markdown.footnotes.label': '腳註',
}
