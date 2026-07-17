/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { list } from './handlers/list.js'
import { listLinks } from './handlers/listLinks.js'
import { read } from './handlers/read.js'
import { resolveLink } from './handlers/resolveLink.js'

/**
 * Handler map for the auto-mountable resource-share routes (see `routes.ts`).
 * It contains EXACTLY the four routes those `routes` mount — the read-only
 * `list`/`read`/`listLinks` plus the public `resolveLink` — and nothing else.
 *
 * SECURITY: all five mutating handlers — the `create` / `update` / `del` grant
 * handlers AND the `createLink` / `revokeLink` public-link handlers — are
 * deliberately absent, because the share table cannot know who owns an
 * arbitrary resource, so none of them may be auto-mounted. Import them directly
 * from `@molecule/api-resource-share` and mount each behind your own
 * resource-ownership gate (plus a `setShareAdminAuthorizer` registration; the
 * handlers also default-DENY on their own until one is registered).
 */
export const requestHandlerMap = {
  list,
  read,
  listLinks,
  resolveLink,
} as const
