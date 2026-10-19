/**
 * Number allocation for comments — the `comment_numbers` rows behind
 * `NumberedComment.number`.
 *
 * Internal to this package: `createComment()` calls `allocateCommentNumber()`
 * so every comment it writes has a number, and `numbers.ts` re-exposes the
 * public surface (`numberComment`, `commentNumbers`, …). The allocation needs
 * no interactive transaction — the unique key on `number` is what makes a
 * concurrent writer lose, and the next attempt reads the new highest number —
 * so it also works on a database bond without transactions (Cloudflare D1).
 *
 * @module
 */

import { create as dbCreate, findMany, findOne, getActiveTransaction } from '@molecule/api-database'

/** The table the numbers live in. */
const NUMBERS = 'comment_numbers'

/** How many times allocation is redone when a concurrent writer took the number first. */
const MAX_ATTEMPTS = 5

/** A row of `comment_numbers`. */
interface CommentNumberRow {
  number: number
  commentId: string
}

/**
 * Allocates the next number for a comment that has none. Each call is one
 * read and, when the comment is unnumbered, one insert.
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
 * unique and increase. A concurrent writer that took the number first fails
 * the insert on the unique key, and the next attempt reads the highest number
 * again. Inside a caller's transaction the work runs once — a failed statement
 * can poison it (Postgres) — and the caller decides.
 *
 * @param commentId - The comment's UUID.
 * @returns Its sequential number.
 * @throws {Error} When no number could be allocated after several attempts.
 */
export async function allocateCommentNumber(commentId: string): Promise<number> {
  if (getActiveTransaction()) return allocate(commentId)
  for (let attempt = 1; ; attempt++) {
    try {
      return await allocate(commentId)
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) {
        throw new Error(`Could not number comment ${commentId}`, { cause: error })
      }
    }
  }
}

/**
 * The numbers of the given comments, in one query.
 *
 * Every comment this package creates has a number, so a comment missing from
 * the map was inserted into `comments` without `createComment()` (a raw insert,
 * or a row from before this package numbered by default). Such a row has NO
 * number — `numberComment(id)` gives it one. Never read a missing entry as `0`:
 * `0` is not a comment id.
 *
 * @param commentIds - The comments' UUIDs.
 * @returns Each numbered comment's UUID mapped to its number.
 */
export async function numbersForComments(
  commentIds: readonly string[],
): Promise<Map<string, number>> {
  if (commentIds.length === 0) return new Map()
  const rows = await findMany<CommentNumberRow>(NUMBERS, {
    where: [{ field: 'commentId', operator: 'in', value: [...commentIds] }],
  })
  return new Map(rows.map((r) => [r.commentId, Number(r.number)]))
}
