import type { AiTranslations } from './types.js'

/** Ai translations for Turkish. */
export const tr: AiTranslations = {
  'ai.error.noProvider': 'AI sağlayıcı yapılandırılmamış. Önce bir AI sağlayıcı bağlayın.',
  'ai.error.ambiguousProvider':
    'Birden fazla adlandırılmış AI sağlayıcı bağlı ve varsayılan ayarlanmamış. Birini seçmek için getProviderByName(name) kullanın.',
  'ai.error.responseIncomplete':
    'Yapay zeka yanıtı tamamlanmadan sona erdi. Lütfen tekrar deneyin.',
  'ai.error.responseTokenLimit':
    'Yapay zeka yanıtı, tamamlanmadan önce çıktı belirteci sınırına ulaştı.',
  'ai.error.apiError': 'Yapay zeka hizmetinde hata oluştu. Lütfen tekrar deneyin.',
  'ai.error.noResponseBody': 'Yapay zeka servisinden yanıt gelmedi.',
}
