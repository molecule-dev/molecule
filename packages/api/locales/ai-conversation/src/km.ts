import type { ConversationTranslations } from './types.js'

/** Conversation translations for Khmer. */
export const km: ConversationTranslations = {
  'conversation.error.messageRequired': 'ត្រូវការ message',
  'conversation.error.aiNotConfigured': 'AI provider មិនត្រូវបានកំណត់រចនាសម្ព័ន្ធ',
  'conversation.error.unknownAiError': 'កំហុស AI មិនស្គាល់',
  'conversation.error.notFound': 'រកមិនឃើញការសន្ទនា',
  'conversation.error.streamError': 'កំហុសក្នុងការ streaming AI',
  'conversation.error.forbidden': 'ការចូលប្រើប្រាស់ត្រូវបានបដិសេធ',
  'conversation.error.unauthorized': 'គ្មានការអនុញ្ញាត',
  'conversation.error.clearFailed': 'មិនអាចសម្អាតការសន្ទនាបានទេ',
  'conversation.error.idRequired':
    'តម្រូវឲ្យមាន conversationId នៅពេលដែលគម្រោងមាន conversation ច្រើនជាងមួយ',
  'conversation.error.historyFailed': 'មិនអាចផ្ទុកប្រវត្តិសន្ទនាបានទេ',
  'conversation.error.readFailed': 'មិនអាចអានការសន្ទនាបានទេ',
  'conversation.error.updateFailed': 'មិនអាចធ្វើបច្ចុប្បន្នភាពការសន្ទនាបានទេ',
}
