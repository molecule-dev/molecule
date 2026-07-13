import type { AiTranslations } from './types.js'

/** Ai translations for Malay. */
export const ms: AiTranslations = {
  'ai.error.noProvider': 'Pembekal AI tidak dikonfigurasi. Ikat pembekal AI terlebih dahulu.',
  'ai.error.apiError': 'Permintaan API AI gagal.',
  'ai.error.noResponseBody': 'Badan respons AI kosong.',
  'ai.error.ambiguousProvider':
    'Beberapa pembekal AI bernama telah diikat dan tiada lalai ditetapkan. Gunakan getProviderByName(name) untuk memilih satu.',
}
