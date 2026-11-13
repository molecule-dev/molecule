import type { ConversationTranslations } from './types.js'

/** Conversation translations for Russian. */
export const ru: ConversationTranslations = {
  'conversation.error.messageRequired': 'message обязательно',
  'conversation.error.aiNotConfigured': 'AI-провайдер не настроен',
  'conversation.error.unknownAiError': 'Неизвестная ошибка AI',
  'conversation.error.notFound': 'Разговор не найден',
  'conversation.error.streamError': 'Ошибка потоковой передачи AI',
  'conversation.error.forbidden': 'Доступ запрещен',
  'conversation.error.unauthorized': 'Несанкционированный доступ',
  'conversation.error.clearFailed': 'Не удалось разрешить разговор',
  'conversation.error.idRequired':
    'Идентификатор беседы (conversationId) обязателен, если в проекте содержится более одной беседы.',
  'conversation.error.historyFailed': 'Не удалось загрузить историю переписки.',
  'conversation.error.readFailed': 'Не смог понять ход разговора',
  'conversation.error.updateFailed': 'Не удалось обновить беседу',
}
