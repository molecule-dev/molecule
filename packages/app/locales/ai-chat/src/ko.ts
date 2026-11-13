import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Korean. */
export const ko: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': '응답 본문이 없습니다',
  'chat.error.streamError': '스트림 오류',
  'chat.error.unknownError': '알 수 없는 오류',
  'chat.error.sendFailed': '메시지 전송에 실패했습니다',
  'chat.error.stalled':
    '{{agentName}} 이 응답을 멈췄습니다. 백그라운드에서 작업이 아직 완료되지 않았을 수 있습니다. 페이지를 새로고침하여 최신 정보를 확인하거나 새 메시지를 보내세요.',
  'aiChat.error.noProvider':
    'AI 채팅 제공업체가 구성되지 않았습니다. 먼저 AI 채팅 제공업체를 연결하세요.',
}
