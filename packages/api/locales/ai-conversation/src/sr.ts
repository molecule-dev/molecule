import type { ConversationTranslations } from './types.js'

/** Conversation translations for Serbian. */
export const sr: ConversationTranslations = {
  'conversation.error.messageRequired': 'message је обавезан',
  'conversation.error.aiNotConfigured': 'AI провајдер није конфигурисан',
  'conversation.error.unknownAiError': 'Непозната AI грешка',
  'conversation.error.notFound': 'Разговор није пронађен',
  'conversation.error.streamError': 'Грешка AI стримовања',
  'conversation.error.forbidden': 'Приступ одбијен',
  'conversation.error.unauthorized': 'Неовлашћено',
  'conversation.error.clearFailed': 'Брисање разговора није успело',
  'conversation.error.idRequired':
    'ИД разговора је потребан када пројекат има више од једног разговора',
  'conversation.error.historyFailed': 'Учитавање историје разговора није успело',
  'conversation.error.readFailed': 'Читање разговора није успело',
  'conversation.error.updateFailed': 'Ажурирање разговора није успело',
}
