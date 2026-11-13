import type { ConversationTranslations } from './types.js'

/** Conversation translations for Turkish. */
export const tr: ConversationTranslations = {
  'conversation.error.messageRequired': 'mesaj gereklidir',
  'conversation.error.aiNotConfigured': 'AI sağlayıcısı yapılandırılmamış',
  'conversation.error.unknownAiError': 'Bilinmeyen AI hatası',
  'conversation.error.notFound': 'Konuşma bulunamadı',
  'conversation.error.streamError': 'AI akış hatası',
  'conversation.error.forbidden': 'Erişim engellendi',
  'conversation.error.unauthorized': 'Yetkisiz',
  'conversation.error.clearFailed': 'Konuşmayı sonlandırmakta başarısız olundu.',
  'conversation.error.idRequired':
    'Projenin birden fazla görüşmesi olduğunda conversationId gereklidir.',
  'conversation.error.historyFailed': 'Konuşma geçmişi yüklenemedi.',
  'conversation.error.readFailed': 'Konuşmayı okuyamadım.',
  'conversation.error.updateFailed': 'Konuşma güncellenemedi.',
}
