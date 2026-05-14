import type { MessageTranslations } from './types.js'

/** Message resource translations for Russian. */
export const ru: MessageTranslations = {
  'message.error.deleteFailed': 'Не удалось удалить сообщение',
  'message.error.editFailed': 'Не удалось изменить сообщение',
  'message.error.listMessagesFailed': 'Не удалось получить список сообщений',
  'message.error.listThreadsFailed': 'Не удалось получить список бесед',
  'message.error.markReadFailed': 'Не удалось отметить беседу как прочитанную',
  'message.error.messageNotFound': 'Сообщение не найдено или не редактируется',
  'message.error.missingMessageId': 'Требуется идентификатор сообщения',
  'message.error.missingThreadId': 'Требуется идентификатор беседы',
  'message.error.notParticipant': 'Вы не являетесь участником этой беседы',
  'message.error.readThreadFailed': 'Не удалось прочитать беседу',
  'message.error.selfThread': 'Нельзя начать беседу с самим собой',
  'message.error.sendFailed': 'Не удалось отправить сообщение',
  'message.error.threadCreateFailed': 'Не удалось создать беседу',
  'message.error.threadNotFound': 'Беседа не найдена',
  'message.error.unreadCountFailed': 'Не удалось получить количество непрочитанных',
  'message.error.validationFailed': 'Проверка не пройдена',
  'message.system.conversationStarted': '{{name}} начал беседу',
  'message.system.messageDeleted': 'Это сообщение удалено',
}
