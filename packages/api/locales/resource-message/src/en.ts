import type { MessageTranslations } from './types.js'

/** Message resource translations for English. */
export const en: MessageTranslations = {
  'message.error.deleteFailed': 'Failed to delete message',
  'message.error.editFailed': 'Failed to edit message',
  'message.error.listMessagesFailed': 'Failed to list messages',
  'message.error.listThreadsFailed': 'Failed to list threads',
  'message.error.markReadFailed': 'Failed to mark thread as read',
  'message.error.messageNotFound': 'Message not found or not editable',
  'message.error.missingMessageId': 'Message ID is required',
  'message.error.missingThreadId': 'Thread ID is required',
  'message.error.notParticipant': 'You are not a participant in this thread',
  'message.error.readThreadFailed': 'Failed to read thread',
  'message.error.selfThread': 'Cannot start a thread with yourself',
  'message.error.sendFailed': 'Failed to send message',
  'message.error.threadCreateFailed': 'Failed to create thread',
  'message.error.threadNotFound': 'Thread not found',
  'message.error.unreadCountFailed': 'Failed to get unread count',
  'message.error.validationFailed': 'Validation failed',
  'message.system.conversationStarted': '{{name}} started a conversation',
  'message.system.messageDeleted': 'This message was deleted',
}
