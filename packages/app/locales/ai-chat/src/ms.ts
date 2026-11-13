import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Malay. */
export const ms: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Tiada response body',
  'chat.error.streamError': 'Ralat stream',
  'chat.error.unknownError': 'Ralat tidak diketahui',
  'chat.error.sendFailed': 'Gagal menghantar mesej',
  'chat.error.stalled':
    '{{agentName}} berhenti membalas. Ia mungkin masih selesai di latar belakang — muat semula untuk melihat yang terkini atau hantar mesej baharu.',
}
