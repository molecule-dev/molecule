/**
 * Forum-thread service — threads + nested replies + voting.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { ForumReplyRow, ForumThreadRow, ForumVoteRow, ThreadStatus } from './types.js'

const THREADS_TABLE = 'forum_threads'
const REPLIES_TABLE = 'forum_replies'
const VOTES_TABLE = 'forum_votes'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

export async function listThreads(opts: {
  category_id?: string
  status?: ThreadStatus
  sort?: 'recent' | 'top' | 'pinned'
  page?: number
  limit?: number
}): Promise<{ data: ForumThreadRow[]; total: number }> {
  const page = opts.page ?? 1
  const limit = opts.limit ?? 25
  const where: WhereCondition[] = []
  if (opts.category_id) where.push({ field: 'category_id', operator: '=', value: opts.category_id })
  if (opts.status) where.push({ field: 'status', operator: '=', value: opts.status })

  const orderBy: OrderBy[] =
    opts.sort === 'top'
      ? [{ field: 'vote_score', direction: 'desc' }]
      : opts.sort === 'pinned'
        ? [
            { field: 'is_pinned', direction: 'desc' },
            { field: 'last_activity_at', direction: 'desc' },
          ]
        : [{ field: 'last_activity_at', direction: 'desc' }]

  const offset = (page - 1) * limit
  const [data, total] = await Promise.all([
    findMany<ForumThreadRow>(THREADS_TABLE, { where, orderBy, limit, offset }),
    count(THREADS_TABLE, where),
  ])
  return { data, total }
}

export async function getThread(threadId: string): Promise<ForumThreadRow | null> {
  return findById<ForumThreadRow>(THREADS_TABLE, threadId)
}

export async function createThread(
  authorId: string,
  data: { title: string; body: string; category_id?: string | null },
): Promise<ForumThreadRow> {
  const slug = slugify(data.title)
  const result = await create<ForumThreadRow>(THREADS_TABLE, {
    author_id: authorId,
    category_id: data.category_id ?? null,
    title: data.title,
    body: data.body,
    slug,
    status: 'open',
    is_pinned: false,
    vote_score: 0,
    reply_count: 0,
    view_count: 0,
    last_activity_at: new Date().toISOString(),
  } as Partial<ForumThreadRow>)
  return result.data!
}

export async function updateThread(
  threadId: string,
  userId: string,
  isModerator: boolean,
  patch: Partial<{
    title: string
    body: string
    category_id: string | null
    status: ThreadStatus
    is_pinned: boolean
  }>,
): Promise<ForumThreadRow | null> {
  const thread = await findById<ForumThreadRow>(THREADS_TABLE, threadId)
  if (!thread) return null
  // Only author OR moderator may update — and pin/status changes require moderator
  if (thread.author_id !== userId && !isModerator) return null
  if ((patch.is_pinned !== undefined || patch.status !== undefined) && !isModerator) return null
  await updateById(THREADS_TABLE, threadId, patch as Partial<ForumThreadRow>)
  return findById<ForumThreadRow>(THREADS_TABLE, threadId)
}

export async function deleteThread(
  threadId: string,
  userId: string,
  isModerator: boolean,
): Promise<boolean> {
  const thread = await findById<ForumThreadRow>(THREADS_TABLE, threadId)
  if (!thread) return false
  if (thread.author_id !== userId && !isModerator) return false
  await deleteById(THREADS_TABLE, threadId)
  return true
}

export async function incrementViewCount(threadId: string): Promise<void> {
  const thread = await findById<ForumThreadRow>(THREADS_TABLE, threadId)
  if (!thread) return
  await updateById(THREADS_TABLE, threadId, {
    view_count: (thread.view_count ?? 0) + 1,
  } as Partial<ForumThreadRow>)
}

export async function listReplies(threadId: string): Promise<ForumReplyRow[]> {
  return findMany<ForumReplyRow>(REPLIES_TABLE, {
    where: [{ field: 'thread_id', operator: '=', value: threadId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
}

export async function createReply(
  threadId: string,
  authorId: string,
  data: { body: string; parent_reply_id?: string | null },
): Promise<ForumReplyRow | null> {
  const thread = await findById<ForumThreadRow>(THREADS_TABLE, threadId)
  if (!thread || thread.status === 'locked' || thread.status === 'archived') return null

  const result = await create<ForumReplyRow>(REPLIES_TABLE, {
    thread_id: threadId,
    parent_reply_id: data.parent_reply_id ?? null,
    author_id: authorId,
    body: data.body,
    vote_score: 0,
    is_deleted: false,
  } as Partial<ForumReplyRow>)

  // Bump thread reply_count + last_activity_at
  await updateById(THREADS_TABLE, threadId, {
    reply_count: (thread.reply_count ?? 0) + 1,
    last_activity_at: new Date().toISOString(),
  } as Partial<ForumThreadRow>)

  return result.data!
}

export async function deleteReply(
  replyId: string,
  userId: string,
  isModerator: boolean,
): Promise<boolean> {
  const reply = await findById<ForumReplyRow>(REPLIES_TABLE, replyId)
  if (!reply) return false
  if (reply.author_id !== userId && !isModerator) return false
  // Soft delete to preserve thread structure
  await updateById(REPLIES_TABLE, replyId, {
    is_deleted: true,
    body: '[deleted]',
  } as Partial<ForumReplyRow>)
  return true
}

/** Cast a vote — idempotent. If user already voted, replaces value (or noop). */
export async function castVote(
  userId: string,
  targetType: 'thread' | 'reply',
  targetId: string,
  value: 1 | -1,
): Promise<{ score: number } | null> {
  const targetTable = targetType === 'thread' ? THREADS_TABLE : REPLIES_TABLE
  const target = await findById<{ vote_score: number }>(targetTable, targetId)
  if (!target) return null

  const existing = await findOne<ForumVoteRow>(VOTES_TABLE, [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'target_type', operator: '=', value: targetType },
    { field: 'target_id', operator: '=', value: targetId },
  ])

  let scoreDelta = 0
  if (!existing) {
    await create<ForumVoteRow>(VOTES_TABLE, {
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      value,
    } as Partial<ForumVoteRow>)
    scoreDelta = value
  } else if (existing.value !== value) {
    await updateById(VOTES_TABLE, existing.id, { value } as Partial<ForumVoteRow>)
    scoreDelta = value - existing.value
  }

  if (scoreDelta !== 0) {
    await updateById(targetTable, targetId, {
      vote_score: target.vote_score + scoreDelta,
    } as Record<string, unknown>)
  }
  return { score: target.vote_score + scoreDelta }
}
