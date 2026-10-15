/**
 * Sequential integer numbers for comments, for APIs whose clients address a
 * comment by an integer (RealWorld's `comment.id` is one; so are most public
 * API specs). The comment keeps its UUID; the number lives in
 * `comment_numbers` and is allocated once, at most one per comment.
 *
 * @module
 */

import {
  create as dbCreate,
  findMany,
  findOne,
  getActiveTransaction,
  withTransaction,
} from '@molecule/api-database'

import { createComment, getCommentById } from './service.js'
import type { Comment, CreateCommentInput } from './types.js'

const NUMBERS = 'comment_numbers'

/** A comment together with its sequential number. */
export type NumberedComment = Comment & {
  /** The comment's sequential integer number (1, 2, 3, …). */
  number: number
}

/** A row of `comment_numbers`. */
interface CommentNumberRow {
  number: number
  commentId: string
}

/** How many times the work is redone when a concurrent writer took the number first. */
const MAX_ATTEMPTS = 5

/**
 * Runs `work` in its own transaction, again when it fails: a concurrent
 * writer that took the same number fails the unique key, and the next
 * attempt allocates the next number. Inside a caller's transaction a failed
 * statement can poison it (Postgres), so there the work runs once and the
 * caller decides.
 *
 * @param what - What is being numbered, for the error.
 * @param work - The allocation.
 * @returns What `work` resolves to.
 */
async function withNumberRetry<T>(what: string, work: () => Promise<T>): Promise<T> {
  if (getActiveTransaction()) return work()
  for (let attempt = 1; ; attempt++) {
    try {
      return await withTransaction(work)
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`Could not number ${what}`, { cause: error })
      // Rolled back; a concurrent writer most likely took the number (its
      // unique key failed). The next attempt reads the new highest number.
    }
  }
}

/**
 * Allocates the next number for a comment that has none (no transaction of its own).
 *
 * @param commentId - The comment's UUID.
 * @returns Its number.
 */
async function allocate(commentId: string): Promise<number> {
  const existing = await findOne<CommentNumberRow>(NUMBERS, [
    { field: 'commentId', operator: '=', value: commentId },
  ])
  if (existing) return Number(existing.number)
  const [last] = await findMany<CommentNumberRow>(NUMBERS, {
    orderBy: [{ field: 'number', direction: 'desc' }],
    limit: 1,
  })
  const number = (last ? Number(last.number) : 0) + 1
  await dbCreate(NUMBERS, { number, commentId })
  return number
}

/**
 * The comment's number, allocating the next one when it has none. Numbers are
 * unique and increase.
 *
 * @param commentId - The comment's UUID.
 * @returns Its sequential number.
 * @throws {Error} When no number could be allocated after several attempts.
 */
export async function numberComment(commentId: string): Promise<number> {
  return withNumberRetry(`comment ${commentId}`, () => allocate(commentId))
}

/**
 * Creates a comment and its number together: both are written, or neither.
 *
 * @param resourceType - The type of resource being commented on.
 * @param resourceId - The ID of the resource being commented on.
 * @param userId - The ID of the commenting user.
 * @param data - The comment creation input.
 * @returns The created comment with its number.
 */
export async function createNumberedComment(
  resourceType: string,
  resourceId: string,
  userId: string,
  data: CreateCommentInput,
): Promise<NumberedComment> {
  return withNumberRetry('a new comment', async () => {
    const comment = await createComment(resourceType, resourceId, userId, data)
    return { ...comment, number: await allocate(comment.id) }
  })
}

/**
 * The comment a number belongs to.
 *
 * @param number - The comment's sequential number.
 * @returns The comment with its number, or `null` when no comment has it.
 */
export async function getCommentByNumber(number: number): Promise<NumberedComment | null> {
  if (!Number.isInteger(number) || number < 1) return null
  const row = await findOne<CommentNumberRow>(NUMBERS, [
    { field: 'number', operator: '=', value: number },
  ])
  if (!row) return null
  const comment = await getCommentById(row.commentId)
  return comment ? { ...comment, number: Number(row.number) } : null
}

/**
 * The numbers of the given comments, for listing them with their numbers.
 * Comments without a number are left out of the map.
 *
 * @param commentIds - The comments' UUIDs.
 * @returns Each numbered comment's UUID mapped to its number.
 */
export async function commentNumbers(commentIds: readonly string[]): Promise<Map<string, number>> {
  if (commentIds.length === 0) return new Map()
  const rows = await findMany<CommentNumberRow>(NUMBERS, {
    where: [{ field: 'commentId', operator: 'in', value: [...commentIds] }],
  })
  return new Map(rows.map((r) => [r.commentId, Number(r.number)]))
}
