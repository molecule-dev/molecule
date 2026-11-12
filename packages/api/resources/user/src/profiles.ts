/**
 * Public user profiles loaded once for a collection, through the bonded store.
 * @module
 */

import { findMany } from '@molecule/api-database'

import type { HandlerResource } from './types.js'

/** User columns safe to display beside content. Account and credential fields are excluded. */
export interface PublicProfile {
  /** The user's canonical id. */
  id: string
  /** The public username, when set. */
  username: string | null
  /** The public display name, when set. */
  name: string | null
  /** The public biography, when set. */
  bio: string | null
  /** The public avatar URL, when set. */
  avatar: string | null
}

/**
 * Load the public profiles for a collection in one database query.
 *
 * Pass every user id from the page once, then join by id while projecting the response.
 * Repeated ids are deduplicated; absent users have no map entry. An empty input does no I/O.
 * Nothing is cached between calls, so a later profile update is visible immediately.
 * The resource option supports an application's renamed users table with the same columns.
 *
 * @param userIds - Canonical user ids referenced by the collection.
 * @param resource - Users resource; defaults to the package's `users` table.
 * @returns Public profiles keyed by id, without email, plan, OAuth or secret fields.
 */
export async function getPublicProfiles(
  userIds: readonly string[],
  resource: Pick<HandlerResource, 'tableName'> = { tableName: 'users' },
): Promise<Map<string, PublicProfile>> {
  const ids = [...new Set(userIds)]
  if (ids.length === 0) return new Map()
  const rows = await findMany<PublicProfile>(resource.tableName, {
    where: [{ field: 'id', operator: 'in', value: ids }],
    select: ['id', 'username', 'name', 'bio', 'avatar'],
  })
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        username: row.username ?? null,
        name: row.name ?? null,
        bio: row.bio ?? null,
        avatar: row.avatar ?? null,
      },
    ]),
  )
}
