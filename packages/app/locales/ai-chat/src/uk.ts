import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Ukrainian. */
export const uk: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Немає тіла відповіді',
  'chat.error.streamError': 'Помилка потокової передачі',
  'chat.error.unknownError': 'Невідома помилка',
  'chat.error.sendFailed': 'Не вдалося надіслати повідомлення',
  'chat.error.stalled':
    '{{agentName}} перестав відповідати. Можливо, він все ще завершується у фоновому режимі — перезавантажте, щоб переглянути останні зміни, або надішліть нове повідомлення.',
}
