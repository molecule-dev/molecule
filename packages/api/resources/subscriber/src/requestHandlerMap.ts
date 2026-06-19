/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { requireAdmin } from './authorizers/index.js'
import { confirm } from './handlers/confirm.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { subscribe } from './handlers/subscribe.js'
import { unsubscribe } from './handlers/unsubscribe.js'

/**
 * Handler map for subscriber resource routes.
 *
 * `requireAdmin` is the admin authorizer middleware referenced by the
 * `list`/`read`/`del` routes. It must live here (as a real handler-map key) so
 * the mlcl injector's route scanner preserves it — a bare middleware string that
 * isn't a handler-map key is silently dropped.
 */
export const requestHandlerMap = {
  subscribe,
  confirm,
  unsubscribe,
  list,
  read,
  del,
  requireAdmin: requireAdmin(),
} as const
