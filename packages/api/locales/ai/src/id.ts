import type { AiTranslations } from './types.js'

/** Ai translations for Indonesian. */
export const id: AiTranslations = {
  'ai.error.noProvider': 'Penyedia AI belum dikonfigurasi. Hubungkan penyedia AI terlebih dahulu.',
  'ai.error.ambiguousProvider':
    'Beberapa penyedia AI bernama telah dihubungkan dan tidak ada default yang ditetapkan. Gunakan getProviderByName(name) untuk memilih salah satu.',
  'ai.error.responseIncomplete': 'Respons AI berakhir sebelum selesai. Silakan coba lagi.',
  'ai.error.responseTokenLimit': 'Respons AI mencapai batas token keluaran sebelum selesai.',
  'ai.error.apiError': 'Terjadi kesalahan pada layanan AI. Silakan coba lagi.',
  'ai.error.noResponseBody': 'Tidak ada respons dari layanan AI.',
}
