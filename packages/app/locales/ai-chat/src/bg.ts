import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Bulgarian. */
export const bg: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Няма тяло на отговора',
  'chat.error.streamError': 'Грешка при поточно предаване',
  'chat.error.unknownError': 'Неизвестна грешка',
  'chat.error.sendFailed': 'Изпращането на съобщението не бе успешно',
  'chat.error.stalled':
    '{{agentName}} спря да отговаря. Възможно е все още да се зарежда във фонов режим — презаредете, за да видите последните новини, или изпратете ново съобщение.',
}
