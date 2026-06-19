/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { createLink } from './handlers/createLink.js'
import { list } from './handlers/list.js'
import { listLinks } from './handlers/listLinks.js'
import { read } from './handlers/read.js'
import { resolveLink } from './handlers/resolveLink.js'
import { revokeLink } from './handlers/revokeLink.js'

/**
 * Handler map for the auto-mountable resource-share routes (see `routes.ts`).
 *
 * SECURITY: the mutating `create` / `update` / `del` grant handlers are
 * deliberately absent — they are NOT part of the auto-mount surface because
 * the share table cannot know who owns an arbitrary resource. Import them
 * directly from `@molecule/api-resource-share` and mount them behind your own
 * resource-ownership gate (plus a `setShareAdminAuthorizer` registration).
 */
export const requestHandlerMap = {
  list,
  read,
  createLink,
  listLinks,
  revokeLink,
  resolveLink,
} as const
