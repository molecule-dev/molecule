/**
 * Comment business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'

import type {
  Comment,
  CreateCommentInput,
  PaginatedResult,
  PaginationOptions,
  UpdateCommentInput,
} from './types.js'

const TABLE = 'comments'

/**
 * Creates a new comment on a resource.
 *
 * @param resourceType - The type of resource being commented on.
 * @param resourceId - The ID of the resource being commented on.
 * @param userId - The ID of the commenting user.
 * @param data - The comment creation input.
 * @returns The created comment.
 */
export async function createComment(
  resourceType: string,
  resourceId: string,
  userId: string,
  data: CreateCommentInput,
): Promise<Comment> {
  const result = await dbCreate<Comment>(TABLE, {
    resourceType,
    resourceId,
    userId,
    parentId: data.parentId ?? null,
    body: data.body,
    editedAt: null,
  })
  return result.data!
}

/**
 * Retrieves paginated comments for a resource, ordered by creation date descending.
 * Only returns top-level comments (no replies).
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @param options - Pagination options.
 * @returns A paginated result of comments.
 */
export async function getCommentsByResource(
  resourceType: string,
  resourceId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Comment>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'resourceType', operator: '=' as const, value: resourceType },
    { field: 'resourceId', operator: '=' as const, value: resourceId },
    { field: 'parentId', operator: 'is_null' as const },
  ]

  const [data, total] = await Promise.all([
    findMany<Comment>(TABLE, {
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
 * Retrieves a single comment by ID.
 *
 * @param commentId - The comment ID to look up.
 * @returns The comment or `null` if not found.
 */
export async function getCommentById(commentId: string): Promise<Comment | null> {
  return findById<Comment>(TABLE, commentId)
}

/**
 * Updates a comment. Only the comment owner can update.
 *
 * @param commentId - The comment ID to update.
 * @param userId - The requesting user's ID (must match comment owner).
 * @param data - The update input.
 * @returns The updated comment or `null` if not found or unauthorized.
 */
export async function updateComment(
  commentId: string,
  userId: string,
  data: UpdateCommentInput,
): Promise<Comment | null> {
  const existing = await findById<Comment>(TABLE, commentId)
  if (!existing || existing.userId !== userId) return null

  const result = await updateById<Comment>(TABLE, commentId, {
    body: data.body,
    editedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return result.data
}

/**
 * Deletes a comment. Only the comment owner can delete.
 *
 * @param commentId - The comment ID to delete.
 * @param userId - The requesting user's ID (must match comment owner).
 * @returns `true` if deleted, `false` if not found or unauthorized.
 */
export async function deleteComment(commentId: string, userId: string): Promise<boolean> {
  const existing = await findById<Comment>(TABLE, commentId)
  if (!existing || existing.userId !== userId) return false

  await deleteById(TABLE, commentId)
  return true
}

/**
 * Retrieves paginated replies to a comment, ordered by creation date ascending.
 *
 * @param commentId - The parent comment ID.
 * @param options - Pagination options.
 * @returns A paginated result of reply comments.
 */
export async function getReplies(
  commentId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<Comment>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [{ field: 'parentId', operator: '=' as const, value: commentId }]

  const [data, total] = await Promise.all([
    findMany<Comment>(TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      limit,
      offset,
    }),
    count(TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Returns the total number of comments on a resource (including replies).
 *
 * @param resourceType - The type of resource.
 * @param resourceId - The ID of the resource.
 * @returns The total comment count.
 */
export async function getCommentCount(resourceType: string, resourceId: string): Promise<number> {
  return count(TABLE, [
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])
}
