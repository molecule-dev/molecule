import type { ConversationTranslations } from './types.js'

/** Conversation translations for Korean. */
export const ko: ConversationTranslations = {
  'conversation.error.messageRequired': 'message는 필수입니다',
  'conversation.error.aiNotConfigured': 'AI 공급자가 구성되지 않았습니다',
  'conversation.error.unknownAiError': '알 수 없는 AI 오류',
  'conversation.error.notFound': '대화를 찾을 수 없습니다',
  'conversation.error.streamError': 'AI 스트리밍 오류',
  'conversation.error.forbidden': '접근 불가',
  'conversation.error.unauthorized': '무단',
  'conversation.error.clearFailed': '대화가 제대로 이루어지지 않았습니다.',
  'conversation.error.idRequired':
    '프로젝트에 대화가 두 개 이상 있는 경우 conversationId는 필수입니다.',
  'conversation.error.historyFailed': '대화 기록을 불러오는 데 실패했습니다.',
  'conversation.error.readFailed': '대화를 읽지 못했습니다',
  'conversation.error.updateFailed': '대화 업데이트에 실패했습니다.',
}
