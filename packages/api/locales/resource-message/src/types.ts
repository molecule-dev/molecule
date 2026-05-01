/** Translation keys for the message resource locale package. */
export type MessageTranslationKey =
  | 'message.error.deleteFailed'
  | 'message.error.editFailed'
  | 'message.error.listMessagesFailed'
  | 'message.error.listThreadsFailed'
  | 'message.error.markReadFailed'
  | 'message.error.messageNotFound'
  | 'message.error.missingMessageId'
  | 'message.error.missingThreadId'
  | 'message.error.notParticipant'
  | 'message.error.readThreadFailed'
  | 'message.error.selfThread'
  | 'message.error.sendFailed'
  | 'message.error.threadCreateFailed'
  | 'message.error.threadNotFound'
  | 'message.error.unreadCountFailed'
  | 'message.error.validationFailed'
  | 'message.system.conversationStarted'
  | 'message.system.messageDeleted'

/** Translation record mapping message keys to translated strings. */
export type MessageTranslations = Record<MessageTranslationKey, string>
