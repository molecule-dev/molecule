/**
 * Sequential integer numbers for comments, for APIs whose clients address a
 * comment by an integer (RealWorld's `comment.id` is one; so are most public
 * API specs). The comment keeps its UUID; the number lives in
 * `comment_numbers` and is allocated once, at most one per comment.
 *
 * **Numbering is the default create path:** `createComment()` writes the
 * comment and its number together, so every comment this package creates is
 * numbered, and a numbered API never has to remember a second call.
 * `createNumberedComment()` is the same create, kept as the name that path
 * reads best. `numberComment(id)` numbers a row that was inserted without it
 * (a raw insert, or a row from before numbering was the default).
 *
 * @module
 */

import { findOne } from '@molecule/api-database'

import { allocateCommentNumber, numbersForComments } from './numbering.js'
import { createComment, getCommentById } from './service.js'
import type { Comment, CreateCommentInput } from './types.js'

/** The table the numbers live in. */
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

/**
 * The comment's number, allocating the next one when it has none. Numbers are
 * unique and increase. Use it for a comment that was inserted into `comments`
 * without `createComment()` — every comment created through this package is
 * numbered already.
 *
 * @param commentId - The comment's UUID.
 * @returns Its sequential number.
 * @throws {Error} When no number could be allocated after several attempts.
 */
export async function numberComment(commentId: string): Promise<number> {
  return allocateCommentNumber(commentId)
}

/**
 * Creates a comment and its number together: both are written, or neither.
 *
 * This is `createComment()` under the name an integer-id API reads best — it
 * takes the same arguments and returns the same `NumberedComment`. Address the
 * result by `number` and read it back with `getCommentByNumber(number)`.
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
  return createComment(resourceType, resourceId, userId, data)
}

/**
 * The comment a number belongs to — the lookup behind an integer-addressed
 * route such as `DELETE /comments/:id`: find the comment here, then pass its
 * `id` to `deleteComment()`/`updateComment()`.
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
 *
 * Every comment created through this package is numbered, so a comment missing
 * from the map was inserted directly into `comments` (or predates numbering by
 * default); give it one with `numberComment(id)`. Never read a missing entry as
 * `0` — `0` is not a comment id, and an integer id of `0` cannot be found again.
 *
 * @param commentIds - The comments' UUIDs.
 * @returns Each numbered comment's UUID mapped to its number.
 */
export async function commentNumbers(commentIds: readonly string[]): Promise<Map<string, number>> {
  return numbersForComments(commentIds)
}
