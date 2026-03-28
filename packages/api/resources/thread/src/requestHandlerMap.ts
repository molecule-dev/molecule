/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { deleteMsg } from './handlers/deleteMessage.js'
import { list } from './handlers/list.js'
import { markThreadRead } from './handlers/markRead.js'
import { createMessage, listMessages } from './handlers/messages.js'
import { read } from './handlers/read.js'
import { unread } from './handlers/unread.js'
import { update } from './handlers/update.js'
import { updateMsg } from './handlers/updateMessage.js'

/**
 * Handler map for thread routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  listMessages,
  createMessage,
  updateMsg,
  deleteMsg,
  markThreadRead,
  unread,
} as const
