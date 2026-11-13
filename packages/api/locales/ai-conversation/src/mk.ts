import type { ConversationTranslations } from './types.js'

/** Conversation translations for Macedonian. */
export const mk: ConversationTranslations = {
  'conversation.error.messageRequired': 'message е задолжително',
  'conversation.error.aiNotConfigured': 'AI провајдерот не е конфигуриран',
  'conversation.error.unknownAiError': 'Непозната AI грешка',
  'conversation.error.notFound': 'Не е пронајден разговор',
  'conversation.error.streamError': 'Грешка при AI стриминг',
  'conversation.error.forbidden': 'Пристапот е одбиен',
  'conversation.error.unauthorized': 'Неовластено',
  'conversation.error.clearFailed': 'Неуспешно чистење на разговорот',
  'conversation.error.idRequired':
    'conversationId е потребен кога проектот има повеќе од еден разговор',
  'conversation.error.historyFailed': 'Неуспешно вчитување на историјата на разговорот',
  'conversation.error.readFailed': 'Не успеа да се прочита разговорот',
  'conversation.error.updateFailed': 'Неуспешно ажурирање на разговорот',
}
