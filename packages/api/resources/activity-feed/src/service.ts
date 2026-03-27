/**
 * Activity feed business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL.
 *
 * @module
 */

import { count, create as dbCreate, findById, findMany, updateById } from '@molecule/api-database'

import type {
  Activity,
  ActivitySeenStatus,
  CreateActivityInput,
  FeedQuery,
  PaginatedResult,
  PaginationOptions,
} from './types.js'

const ACTIVITIES_TABLE = 'activities'
const SEEN_STATUS_TABLE = 'activity_seen_status'

/**
 * Logs a new activity to the feed.
 *
 * @param data - The activity creation input.
 * @returns The created activity.
 */
export async function logActivity(data: CreateActivityInput): Promise<Activity> {
  const result = await dbCreate<Activity>(ACTIVITIES_TABLE, {
    actorId: data.actorId,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    metadata: data.metadata ?? null,
  })
  return result.data!
}

/**
 * Retrieves a paginated activity feed for a user. Returns activities from
 * all actors, optionally filtered by resource type or action.
 *
 * @param _userId - The user requesting the feed (reserved for future per-user filtering).
 * @param options - Query and pagination options.
 * @returns A paginated result of activities.
 */
export async function getFeed(
  _userId: string,
  options: FeedQuery = {},
): Promise<PaginatedResult<Activity>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    ...(options.resourceType !== undefined
      ? [{ field: 'resourceType', operator: '=' as const, value: options.resourceType }]
      : []),
    ...(options.action !== undefined
      ? [{ field: 'action', operator: '=' as const, value: options.action }]
      : []),
  ]

  const [data, total] = await Promise.all([
    findMany<Activity>(ACTIVITIES_TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(ACTIVITIES_TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Retrieves a paginated timeline of activities for a specific resource.
 *
 * @param resourceType - The resource type to get the timeline for.
 * @param resourceId - The resource ID to get the timeline for.
 * @param options - Pagination options.
 * @returns A paginated result of activities.
 */
export async function getTimeline(
  resourceType: string,
  resourceId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Activity>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
  ]

  const [data, total] = await Promise.all([
    findMany<Activity>(ACTIVITIES_TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(ACTIVITIES_TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Marks activities as seen for a user up to a given activity ID.
 *
 * @param userId - The user marking activities as seen.
 * @param upToId - The ID of the last activity seen.
 */
export async function markSeen(userId: string, upToId: string): Promise<void> {
  const where = [{ field: 'userId', operator: '=' as const, value: userId }]

  const existing = await findMany<ActivitySeenStatus>(SEEN_STATUS_TABLE, {
    where,
    limit: 1,
  })

  if (existing.length > 0) {
    await updateById(SEEN_STATUS_TABLE, existing[0].userId, {
      lastSeenActivityId: upToId,
      updatedAt: new Date().toISOString(),
    })
  } else {
    await dbCreate(SEEN_STATUS_TABLE, {
      userId,
      lastSeenActivityId: upToId,
      updatedAt: new Date().toISOString(),
    })
  }
}

/**
 * Returns the number of unseen activities for a user.
 * An activity is unseen if it was created after the user's last-seen position,
 * or if the user has never marked anything as seen.
 *
 * @param userId - The user ID.
 * @returns The count of unseen activities.
 */
export async function getUnseenCount(userId: string): Promise<number> {
  const seenStatuses = await findMany<ActivitySeenStatus>(SEEN_STATUS_TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    limit: 1,
  })

  if (seenStatuses.length === 0) {
    return count(ACTIVITIES_TABLE, [])
  }

  const lastSeenActivity = await findById<Activity>(
    ACTIVITIES_TABLE,
    seenStatuses[0].lastSeenActivityId,
  )

  if (!lastSeenActivity) {
    return count(ACTIVITIES_TABLE, [])
  }

  return count(ACTIVITIES_TABLE, [
    { field: 'createdAt', operator: '>', value: lastSeenActivity.createdAt },
  ])
}
