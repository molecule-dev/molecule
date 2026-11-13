import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Azerbaijani. */
export const az: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Cavab gövdəsi yoxdur',
  'chat.error.streamError': 'Axın xətası',
  'chat.error.unknownError': 'Naməlum xəta',
  'chat.error.sendFailed': 'Mesaj göndərmək alınmadı',
  'chat.error.stalled':
    '{{agentName}} cavab verməyi dayandırdı. Hələ də arxa planda tamamlana bilər — ən son xəbəri görmək üçün yenidən yükləyin və ya yeni mesaj göndərin.',
  'aiChat.error.noProvider':
    'Süni intellekt çat provayderi konfiqurasiya edilməyib. Əvvəlcə süni intellekt çat provayderini bağlayın.',
}
