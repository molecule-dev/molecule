/**
 * Bookmark business logic service.
 *
 * @module
 */

import { count, create as dbCreate, deleteMany, findMany, findOne } from '@molecule/api-database'

import type { Bookmark, BookmarkQuery, PaginatedResult } from './types.js'

const TABLE = 'bookmarks'

/**
 * Adds a bookmark. Idempotent — returns existing bookmark if already bookmarked.
 *
 * @param userId - The user ID.
 * @param resourceType - The type of resource to bookmark.
 * @param resourceId - The ID of the resource to bookmark.
 * @param folder - Optional folder name.
 * @returns The created or existing bookmark.
 */
export async function addBookmark(
  userId: string,
  resourceType: string,
  resourceId: string,
  folder?: string,
): Promise<Bookmark> {
  const existing = await findOne<Bookmark>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])

  if (existing) return existing

  const result = await dbCreate<Bookmark>(TABLE, {
    userId,
    resourceType,
    resourceId,
    folder: folder ?? null,
  })
  return result.data!
}

/**
 * Removes a bookmark.
 *
 * @param userId - The user ID.
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 */
export async function removeBookmark(
  userId: string,
  resourceType: string,
  resourceId: string,
): Promise<void> {
  await deleteMany(TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])
}

/**
 * Gets all bookmarks for a user with optional filtering and pagination.
 *
 * @param userId - The user ID.
 * @param options - Query options.
 * @returns Paginated bookmarks.
 */
export async function getBookmarks(
  userId: string,
  options: BookmarkQuery = {},
): Promise<PaginatedResult<Bookmark>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'userId', operator: '=' as const, value: userId },
    ...(options.resourceType
      ? [{ field: 'resourceType', operator: '=' as const, value: options.resourceType }]
      : []),
    ...(options.folder ? [{ field: 'folder', operator: '=' as const, value: options.folder }] : []),
  ]

  const [data, total] = await Promise.all([
    findMany<Bookmark>(TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Checks if a resource is bookmarked by a user.
 *
 * @param userId - The user ID.
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @returns `true` if bookmarked.
 */
export async function isBookmarked(
  userId: string,
  resourceType: string,
  resourceId: string,
): Promise<boolean> {
  const existing = await findOne<Bookmark>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])
  return existing !== null
}

/**
 * Gets all unique folder names for a user's bookmarks.
 *
 * @param userId - The user ID.
 * @returns Array of folder names.
 */
export async function getFolders(userId: string): Promise<string[]> {
  const bookmarks = await findMany<Bookmark>(TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    select: ['folder'],
  })

  const folders = new Set<string>()
  for (const b of bookmarks) {
    if (b.folder) folders.add(b.folder)
  }
  return [...folders].sort()
}
