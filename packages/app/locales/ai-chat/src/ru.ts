import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Russian. */
export const ru: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Нет тела ответа',
  'chat.error.streamError': 'Ошибка потоковой передачи',
  'chat.error.unknownError': 'Неизвестная ошибка',
  'chat.error.sendFailed': 'Не удалось отправить сообщение',
  'chat.error.stalled':
    '{{agentName}} перестал отвечать. Возможно, процесс еще завершается в фоновом режиме — обновите страницу, чтобы увидеть последние данные, или отправьте новое сообщение.',
  'aiChat.error.noProvider':
    'Поставщик чата с использованием ИИ не настроен. Сначала подключите поставщика чата с использованием ИИ.',
}
