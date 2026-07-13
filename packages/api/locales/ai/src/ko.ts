import type { AiTranslations } from './types.js'

/** Ai translations for Korean. */
export const ko: AiTranslations = {
  'ai.error.noProvider': 'AI 제공자가 구성되지 않았습니다. 먼저 AI 제공자를 바인딩하세요.',
  'ai.error.apiError': 'AI API 요청이 실패했습니다.',
  'ai.error.noResponseBody': 'AI 응답 본문이 비어 있습니다.',
  'ai.error.ambiguousProvider':
    '이름이 지정된 여러 AI 제공자가 바인딩되어 있으며 기본값이 설정되지 않았습니다. getProviderByName(name)을 사용하여 하나를 선택하세요.',
}
