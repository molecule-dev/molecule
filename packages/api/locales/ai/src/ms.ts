import type { AiTranslations } from './types.js'

/** Ai translations for Malay. */
export const ms: AiTranslations = {
  'ai.error.noProvider': 'Pembekal AI tidak dikonfigurasi. Ikat pembekal AI terlebih dahulu.',
  'ai.error.ambiguousProvider':
    'Beberapa pembekal AI bernama telah diikat dan tiada lalai ditetapkan. Gunakan getProviderByName(name) untuk memilih satu.',
  'ai.error.responseIncomplete': 'Respons AI tamat sebelum selesai. Sila cuba lagi.',
  'ai.error.responseTokenLimit': 'Respons AI mencapai had token output sebelum selesai.',
  'ai.error.apiError': 'Ralat perkhidmatan AI. Sila cuba lagi.',
  'ai.error.noResponseBody': 'Tiada respons daripada perkhidmatan AI.',
}
