/**
 * Reaction business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL.
 *
 * @module
 */

import { count, create as dbCreate, deleteMany, findMany, findOne } from '@molecule/api-database'

import type { Reaction, ReactionSummary } from './types.js'

const TABLE = 'reactions'

/**
 * Adds a reaction to a resource. If the user already has the same reaction type
 * on this resource, returns the existing one (idempotent).
 *
 * @param resourceType - The type of resource being reacted to.
 * @param resourceId - The ID of the resource being reacted to.
 * @param userId - The ID of the reacting user.
 * @param type - The reaction type (e.g. 'like', 'love').
 * @returns The created or existing reaction.
 */
export async function addReaction(
  resourceType: string,
  resourceId: string,
  userId: string,
  type: string,
): Promise<Reaction> {
  const existing = await findOne<Reaction>(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
    { field: 'userId', operator: '=', value: userId },
    { field: 'type', operator: '=', value: type },
  ])

  if (existing) return existing

  const result = await dbCreate<Reaction>(TABLE, {
    resourceType,
    resourceId,
    userId,
    type,
  })
  return result.data!
}

/**
 * Removes a user's reaction from a resource. If `type` is provided, removes
 * only that reaction type. Otherwise, removes all reactions by the user on
 * the resource.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @param userId - The ID of the user.
 * @param type - Optional specific reaction type to remove.
 */
export async function removeReaction(
  resourceType: string,
  resourceId: string,
  userId: string,
  type?: string,
): Promise<void> {
  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
    { field: 'userId', operator: '=' as const, value: userId },
    ...(type ? [{ field: 'type', operator: '=' as const, value: type }] : []),
  ]

  await deleteMany(TABLE, where)
}

/**
 * Gets a reaction summary for a resource, including counts per type and the
 * current user's reactions.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @param userId - Optional current user ID to include their reactions.
 * @returns A reaction summary with total, counts, and user reactions.
 */
export async function getReactionSummary(
  resourceType: string,
  resourceId: string,
  userId?: string,
): Promise<ReactionSummary> {
  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
  ]

  const [reactions, total] = await Promise.all([
    findMany<Reaction>(TABLE, { where }),
    count(TABLE, where),
  ])

  const counts: Record<string, number> = {}
  const userReactions: string[] = []

  for (const reaction of reactions) {
    counts[reaction.type] = (counts[reaction.type] ?? 0) + 1
    if (userId && reaction.userId === userId) {
      userReactions.push(reaction.type)
    }
  }

  return { total, counts, userReactions }
}

/**
 * Gets the current user's reaction on a resource, if any.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @param userId - The user ID.
 * @returns The user's reactions on this resource.
 */
export async function getUserReactions(
  resourceType: string,
  resourceId: string,
  userId: string,
): Promise<Reaction[]> {
  return findMany<Reaction>(TABLE, {
    where: [
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
      { field: 'userId', operator: '=', value: userId },
    ],
  })
}

/**
 * Gets reaction counts per type for a resource.
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @returns A record of reaction type to count.
 */
export async function getReactionCounts(
  resourceType: string,
  resourceId: string,
): Promise<Record<string, number>> {
  const reactions = await findMany<Reaction>(TABLE, {
    where: [
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
    ],
  })

  const counts: Record<string, number> = {}
  for (const reaction of reactions) {
    counts[reaction.type] = (counts[reaction.type] ?? 0) + 1
  }
  return counts
}
