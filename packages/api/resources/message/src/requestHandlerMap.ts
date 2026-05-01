/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { createThread } from './handlers/createThread.js'
import { deleteMessageHandler } from './handlers/deleteMessage.js'
import { editMessageHandler } from './handlers/editMessage.js'
import { listThreads } from './handlers/listThreads.js'
import { markReadHandler } from './handlers/markRead.js'
import { listMessagesHandler, sendMessageHandler } from './handlers/messages.js'
import { readThread } from './handlers/readThread.js'
import { unreadCount } from './handlers/unreadCount.js'

/**
 * Handler map for message resource routes.
 */
export const requestHandlerMap = {
  createThread,
  listThreads,
  readThread,
  listMessages: listMessagesHandler,
  sendMessage: sendMessageHandler,
  markRead: markReadHandler,
  editMessage: editMessageHandler,
  deleteMessage: deleteMessageHandler,
  unreadCount,
} as const
