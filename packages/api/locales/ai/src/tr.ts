import type { AiTranslations } from './types.js'

/** Ai translations for Turkish. */
export const tr: AiTranslations = {
  'ai.error.noProvider': 'AI sağlayıcı yapılandırılmamış. Önce bir AI sağlayıcı bağlayın.',
  'ai.error.apiError': 'AI API isteği başarısız oldu.',
  'ai.error.noResponseBody': 'AI yanıt gövdesi boş.',
  'ai.error.ambiguousProvider':
    'Birden fazla adlandırılmış AI sağlayıcı bağlı ve varsayılan ayarlanmamış. Birini seçmek için getProviderByName(name) kullanın.',
}
