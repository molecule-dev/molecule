import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Chinese (Simplified). */
export const zh: MarkdownTranslations = {
  'markdown.components.invalid': 'components 中包含一个既不是 React 组件也不是元素名称的条目。',
  'markdown.components.unsupported':
    'marked 提供程序无法使用 components，因为它返回 HTML 字符串。请使用 elementAttributes 添加属性。',
  'markdown.elementAttributes.invalidName': '"{{name}}" 不是属性名称（在 <{{element}}> 上）',
  'markdown.elementAttributes.refused':
    'elementAttributes 无法在 <{{element}}> 上设置 "{{name}}"：该属性由渲染器所有',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes 指定了 markdown 不会生成的 <{{element}}>',
  'markdown.footnotes.backToReference': '返回引用 {{reference}}',
  'markdown.footnotes.label': '脚注',
}
