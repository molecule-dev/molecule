import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Korean. */
export const ko: MarkdownTranslations = {
  'markdown.components.invalid': 'components에 React 컴포넌트나 요소 이름이 아닌 항목이 있습니다.',
  'markdown.components.unsupported':
    'marked 제공자는 HTML 문자열을 반환하므로 components를 사용할 수 없습니다. 속성을 추가하려면 elementAttributes를 사용하세요.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}"은(는) 속성 이름이 아닙니다 (<{{element}}>에서)',
  'markdown.elementAttributes.refused':
    'elementAttributes는 <{{element}}>에 "{{name}}"을(를) 설정할 수 없습니다: 렌더러가 소유합니다',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes가 지정한 <{{element}}>은(는) markdown이 생성하지 않습니다',
  'markdown.footnotes.backToReference': '참조 {{reference}}(으)로 돌아가기',
  'markdown.footnotes.label': '각주',
}
