import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Turkish. */
export const tr: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Yanıt gövdesi yok',
  'chat.error.streamError': 'Akış hatası',
  'chat.error.unknownError': 'Bilinmeyen hata',
  'chat.error.sendFailed': 'Mesaj gönderilemedi.',
  'chat.error.stalled':
    '{{agentName}} yanıt vermeyi durdurdu. Arka planda işlem hala devam ediyor olabilir — en son durumu görmek için sayfayı yeniden yükleyin veya yeni bir mesaj gönderin.',
}
