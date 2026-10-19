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

import { allocateCommentNumber } from './numbering.js'
import type { NumberedComment } from './numbers.js'
import type {
  Comment,
  CreateCommentInput,
  PaginatedResult,
  PaginationOptions,
  UpdateCommentInput,
} from './types.js'

const TABLE = 'comments'

/**
 * Creates a new comment on a resource, with its sequential number.
 *
 * The comment row and its `comment_numbers` row are written together: the
 * returned comment carries `number` (1, 2, 3, …) beside its UUID `id`. An API
 * whose clients address a comment by an integer (RealWorld's `comment.id`,
 * `DELETE /comments/:id`) returns `number` as that id and reads it back with
 * `getCommentByNumber(number)` — never hand-build an id from the UUID.
 * `createNumberedComment()` is this same create under the name that path reads
 * best; `numberComment(id)` numbers a row that was inserted without this
 * function.
 *
 * Both `__setup__` SQL files are required (`comments`, `comment_numbers`).
 *
 * @param resourceType - The type of resource being commented on.
 * @param resourceId - The ID of the resource being commented on.
 * @param userId - The ID of the commenting user.
 * @param data - The comment creation input.
 * @returns The created comment with its sequential `number`.
 * @throws {Error} When the comment could not be numbered; the comment row is
 *   removed again so the caller is not told a create failed while it exists.
 */
export async function createComment(
  resourceType: string,
  resourceId: string,
  userId: string,
  data: CreateCommentInput,
): Promise<NumberedComment> {
  const result = await dbCreate<Comment>(TABLE, {
    resourceType,
    resourceId,
    userId,
    parentId: data.parentId ?? null,
    body: data.body,
    editedAt: null,
  })
  const comment = result.data!
  try {
    return { ...comment, number: await allocateCommentNumber(comment.id) }
  } catch (error) {
    // The caller is told the create failed, so the row must not stay behind.
    try {
      await deleteById(TABLE, comment.id)
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Could not number comment ${comment.id}, and could not remove the unnumbered row`,
        { cause: cleanupError },
      )
    }
    throw error
  }
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
    // Strictly later than the last write: an edit in the same millisecond as the create
    // still shows a changed updatedAt.
    updatedAt: new Date(
      Math.max(Date.now(), (Date.parse(String(existing.updatedAt ?? '')) || 0) + 1),
    ).toISOString(),
  })
  return result.data
}

/**
 * Deletes a comment. Only the comment owner can delete.
 *
 * @param commentId - The comment's UUID. To delete by the integer number an
 *   API like RealWorld exposes (`DELETE /comments/:id`), look the row up with
 *   `getCommentByNumber(number)` and pass its `id`.
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
