import type { ConversationTranslations } from './types.js'

/** Conversation translations for Bulgarian. */
export const bg: ConversationTranslations = {
  'conversation.error.messageRequired': 'message е задължително',
  'conversation.error.aiNotConfigured': 'AI доставчикът не е конфигуриран',
  'conversation.error.unknownAiError': 'Неизвестна AI грешка',
  'conversation.error.notFound': 'Не е намерен разговор',
  'conversation.error.streamError': 'Грешка при AI поточно предаване',
  'conversation.error.forbidden': 'Достъпът е отказан',
  'conversation.error.unauthorized': 'Неоторизирано',
  'conversation.error.clearFailed': 'Изчистването на разговора не бе успешно',
  'conversation.error.idRequired':
    'conversationId е необходим, когато проектът има повече от един разговор',
  'conversation.error.historyFailed': 'Зареждането на историята на разговорите не бе успешно',
  'conversation.error.readFailed': 'Прочитането на разговора не бе успешно',
  'conversation.error.updateFailed': 'Актуализирането на разговора не бе успешно',
}
