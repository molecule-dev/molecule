import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Indonesian. */
export const id: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Tidak ada response body',
  'chat.error.streamError': 'Kesalahan stream',
  'chat.error.unknownError': 'Kesalahan tidak diketahui',
  'chat.error.sendFailed': 'Pesan gagal terkirim',
  'chat.error.stalled':
    '{{agentName}} berhenti merespons. Mungkin masih dalam proses penyelesaian di latar belakang — muat ulang untuk melihat status terbaru, atau kirim pesan baru.',
}
