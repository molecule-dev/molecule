import type { ConversationTranslations } from './types.js'

/** Conversation translations for Indonesian. */
export const id: ConversationTranslations = {
  'conversation.error.messageRequired': 'message diperlukan',
  'conversation.error.aiNotConfigured': 'AI provider belum dikonfigurasi',
  'conversation.error.unknownAiError': 'Kesalahan AI tidak diketahui',
  'conversation.error.notFound': 'Percakapan tidak ditemukan',
  'conversation.error.streamError': 'Kesalahan streaming AI',
  'conversation.error.forbidden': 'Akses ditolak',
  'conversation.error.unauthorized': 'Tidak sah',
  'conversation.error.clearFailed': 'Percakapan gagal diselesaikan',
  'conversation.error.idRequired':
    'conversationId diperlukan jika proyek memiliki lebih dari satu percakapan.',
  'conversation.error.historyFailed': 'Riwayat percakapan gagal dimuat.',
  'conversation.error.readFailed': 'Gagal membaca percakapan',
  'conversation.error.updateFailed': 'Percakapan gagal diperbarui',
}
