import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Japanese. */
export const ja: MarkdownTranslations = {
  'markdown.components.invalid':
    'components に React コンポーネントでも要素名でもないエントリが含まれています。',
  'markdown.components.unsupported':
    'marked プロバイダーは HTML 文字列を返すため components を使用できません。属性を追加するには elementAttributes を使用してください。',
  'markdown.elementAttributes.invalidName': '"{{name}}" は属性名ではありません (<{{element}}> 上)',
  'markdown.elementAttributes.refused':
    'elementAttributes は <{{element}}> に "{{name}}" を設定できません: レンダラーが所有しています',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes が指定する <{{element}}> は markdown が生成しません',
  'markdown.footnotes.backToReference': '参照 {{reference}} に戻る',
  'markdown.footnotes.label': '脚注',
}
