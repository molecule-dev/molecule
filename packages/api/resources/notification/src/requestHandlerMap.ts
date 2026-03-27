/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { del } from './handlers/del.js'
import { getPreferencesHandler } from './handlers/get-preferences.js'
import { list } from './handlers/list.js'
import { markAllReadHandler } from './handlers/mark-all-read.js'
import { markReadHandler } from './handlers/mark-read.js'
import { unreadCount } from './handlers/unread-count.js'
import { updatePreferencesHandler } from './handlers/update-preferences.js'

/**
 * Handler map for notification resource routes.
 */
export const requestHandlerMap = {
  list,
  unreadCount,
  markRead: markReadHandler,
  markAllRead: markAllReadHandler,
  del,
  getPreferences: getPreferencesHandler,
  updatePreferences: updatePreferencesHandler,
} as const
