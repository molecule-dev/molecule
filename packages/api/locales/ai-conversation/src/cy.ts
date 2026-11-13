import type { ConversationTranslations } from './types.js'

/** Conversation translations for Welsh. */
export const cy: ConversationTranslations = {
  'conversation.error.messageRequired': 'Mae angen neges',
  'conversation.error.aiNotConfigured': 'Darparwr AI heb ei ffurfweddu',
  'conversation.error.unknownAiError': 'Gwall AI anhysbys',
  'conversation.error.notFound': "Dim sgwrs wedi'i chanfod",
  'conversation.error.streamError': 'Gwall ffrydio AI',
  'conversation.error.forbidden': "Mynediad wedi'i wrthod",
  'conversation.error.unauthorized': 'Heb awdurdod',
  'conversation.error.clearFailed': "Methwyd clirio'r sgwrs",
  'conversation.error.idRequired':
    'Mae angen conversationId pan fydd gan y prosiect fwy nag un sgwrs',
  'conversation.error.historyFailed': 'Methwyd llwytho hanes sgwrs',
  'conversation.error.readFailed': 'Methwyd darllen y sgwrs',
  'conversation.error.updateFailed': "Methwyd diweddaru'r sgwrs",
}
