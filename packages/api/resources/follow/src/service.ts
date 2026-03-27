/**
 * Follow business logic service.
 *
 * @module
 */

import { count, create as dbCreate, deleteMany, findMany, findOne } from '@molecule/api-database'

import type { Follow, PaginatedResult, PaginationOptions } from './types.js'

const TABLE = 'follows'

/**
 * Creates a follow relationship. Idempotent — returns existing follow if already following.
 *
 * @param followerId - The ID of the follower.
 * @param targetType - The type of target being followed.
 * @param targetId - The ID of the target being followed.
 * @returns The created or existing follow.
 */
export async function follow(
  followerId: string,
  targetType: string,
  targetId: string,
): Promise<Follow> {
  const existing = await findOne<Follow>(TABLE, [
    { field: 'followerId', operator: '=', value: followerId },
    { field: 'targetType', operator: '=', value: targetType },
    { field: 'targetId', operator: '=', value: targetId },
  ])

  if (existing) return existing

  const result = await dbCreate<Follow>(TABLE, { followerId, targetType, targetId })
  return result.data!
}

/**
 * Removes a follow relationship.
 *
 * @param followerId - The ID of the follower.
 * @param targetType - The type of target.
 * @param targetId - The ID of the target.
 */
export async function unfollow(
  followerId: string,
  targetType: string,
  targetId: string,
): Promise<void> {
  await deleteMany(TABLE, [
    { field: 'followerId', operator: '=', value: followerId },
    { field: 'targetType', operator: '=', value: targetType },
    { field: 'targetId', operator: '=', value: targetId },
  ])
}

/**
 * Gets paginated followers of a target.
 *
 * @param targetType - The type of target.
 * @param targetId - The ID of the target.
 * @param options - Pagination options.
 * @returns Paginated followers.
 */
export async function getFollowers(
  targetType: string,
  targetId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Follow>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'targetType', operator: '=' as const, value: targetType },
    { field: 'targetId', operator: '=' as const, value: targetId },
  ]

  const [data, total] = await Promise.all([
    findMany<Follow>(TABLE, {
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
 * Gets paginated targets a user is following.
 *
 * @param userId - The follower's user ID.
 * @param options - Pagination options.
 * @returns Paginated follows.
 */
export async function getFollowing(
  userId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Follow>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [{ field: 'followerId', operator: '=' as const, value: userId }]

  const [data, total] = await Promise.all([
    findMany<Follow>(TABLE, {
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
 * Checks if a user is following a target.
 *
 * @param followerId - The follower's user ID.
 * @param targetType - The type of target.
 * @param targetId - The ID of the target.
 * @returns `true` if following.
 */
export async function isFollowing(
  followerId: string,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  const existing = await findOne<Follow>(TABLE, [
    { field: 'followerId', operator: '=', value: followerId },
    { field: 'targetType', operator: '=', value: targetType },
    { field: 'targetId', operator: '=', value: targetId },
  ])
  return existing !== null
}

/**
 * Gets the follower count for a target.
 *
 * @param targetType - The type of target.
 * @param targetId - The ID of the target.
 * @returns The number of followers.
 */
export async function getFollowerCount(targetType: string, targetId: string): Promise<number> {
  return count(TABLE, [
    { field: 'targetType', operator: '=', value: targetType },
    { field: 'targetId', operator: '=', value: targetId },
  ])
}

/**
 * Gets the following count for a user.
 *
 * @param userId - The user ID.
 * @returns The number of targets the user is following.
 */
export async function getFollowingCount(userId: string): Promise<number> {
  return count(TABLE, [{ field: 'followerId', operator: '=', value: userId }])
}
