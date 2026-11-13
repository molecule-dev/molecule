import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Macedonian. */
export const mk: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Нема тело на одговорот',
  'chat.error.streamError': 'Грешка при стриминг',
  'chat.error.unknownError': 'Непозната грешка',
  'chat.error.sendFailed': 'Неуспешно испраќање на пораката',
  'chat.error.stalled':
    '{{agentName}} престана да одговара. Можеби сè уште завршува во позадина — вчитајте повторно за да ги видите најновите информации или испратете нова порака.',
}
