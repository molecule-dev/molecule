import type { AiTranslations } from './types.js'

/** Ai translations for Indonesian. */
export const id: AiTranslations = {
  'ai.error.noProvider': 'Penyedia AI belum dikonfigurasi. Hubungkan penyedia AI terlebih dahulu.',
  'ai.error.apiError': 'Permintaan API AI gagal.',
  'ai.error.noResponseBody': 'Isi respons AI kosong.',
  'ai.error.ambiguousProvider':
    'Beberapa penyedia AI bernama telah dihubungkan dan tidak ada default yang ditetapkan. Gunakan getProviderByName(name) untuk memilih salah satu.',
}
