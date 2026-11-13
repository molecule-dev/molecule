import type { ConversationTranslations } from './types.js'

/** Conversation translations for Ukrainian. */
export const uk: ConversationTranslations = {
  'conversation.error.messageRequired': "message є обов'язковим",
  'conversation.error.aiNotConfigured': 'AI-провайдер не налаштований',
  'conversation.error.unknownAiError': 'Невідома помилка AI',
  'conversation.error.notFound': 'Розмову не знайдено',
  'conversation.error.streamError': 'Помилка потокової передачі AI',
  'conversation.error.forbidden': 'Доступ заборонено',
  'conversation.error.unauthorized': 'Неавторизовано',
  'conversation.error.clearFailed': 'Не вдалося очистити розмову',
  'conversation.error.idRequired':
    "conversationId обов'язковий, якщо проєкт містить більше однієї розмови.",
  'conversation.error.historyFailed': 'Не вдалося завантажити історію розмов',
  'conversation.error.readFailed': 'Не вдалося прочитати розмову',
  'conversation.error.updateFailed': 'Не вдалося оновити розмову',
}
