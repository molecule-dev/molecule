import type { ConversationTranslations } from './types.js'

/** Conversation translations for Filipino. */
export const fil: ConversationTranslations = {
  'conversation.error.messageRequired': 'Kailangan ang message',
  'conversation.error.aiNotConfigured': 'Hindi naka-configure ang AI provider',
  'conversation.error.unknownAiError': 'Hindi kilalang AI error',
  'conversation.error.notFound': 'Walang nahanap na conversation',
  'conversation.error.streamError': 'May error sa AI streaming',
  'conversation.error.forbidden': 'Tinanggihan ang pag-access',
  'conversation.error.unauthorized': 'Hindi awtorisado',
  'conversation.error.clearFailed': 'Hindi na-clear ang pag-uusap',
  'conversation.error.idRequired':
    'Kinakailangan ang conversationId kapag ang proyekto ay mayroong higit sa isang pag-uusap',
  'conversation.error.historyFailed': 'Nabigong i-load ang history ng pag-uusap',
  'conversation.error.readFailed': 'Hindi nabasa ang pag-uusap',
  'conversation.error.updateFailed': 'Nabigong i-update ang pag-uusap',
}
