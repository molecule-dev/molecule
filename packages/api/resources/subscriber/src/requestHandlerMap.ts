/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { confirm } from './handlers/confirm.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { subscribe } from './handlers/subscribe.js'
import { unsubscribe } from './handlers/unsubscribe.js'

/**
 * Handler map for subscriber resource routes.
 */
export const requestHandlerMap = {
  subscribe,
  confirm,
  unsubscribe,
  list,
  read,
  del,
} as const
