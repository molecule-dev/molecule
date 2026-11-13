import type { AiTranslations } from './types.js'

/** Ai translations for Korean. */
export const ko: AiTranslations = {
  'ai.error.noProvider': 'AI 제공자가 구성되지 않았습니다. 먼저 AI 제공자를 바인딩하세요.',
  'ai.error.ambiguousProvider':
    '이름이 지정된 여러 AI 제공자가 바인딩되어 있으며 기본값이 설정되지 않았습니다. getProviderByName(name)을 사용하여 하나를 선택하세요.',
  'ai.error.responseIncomplete': 'AI 응답이 완료되기 전에 종료되었습니다. 다시 시도해 주세요.',
  'ai.error.responseTokenLimit': 'AI 응답이 완료되기 전에 출력 토큰 제한에 도달했습니다.',
  'ai.error.apiError': 'AI 서비스 오류입니다. 다시 시도해 주세요.',
  'ai.error.noResponseBody': 'AI 서비스에서 응답이 없습니다.',
}
